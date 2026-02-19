import dotenv from 'dotenv';
import net from 'node:net';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

dotenv.config();

/** Prueba si el primer servidor LDAP configurado responde en el puerto TCP */
async function isLdapReachable(): Promise<boolean> {
  try {
    const servers = JSON.parse(process.env.LDAP_SERVERS || '[]') as Array<{ url: string }>;
    if (!servers.length) return false;
    const url = new URL(servers[0].url);
    const host = url.hostname;
    const port = Number(url.port) || 389;
    return await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port });
      socket.setTimeout(2000);
      socket.on('connect', () => { socket.destroy(); resolve(true); });
      socket.on('error', () => resolve(false));
      socket.on('timeout', () => { socket.destroy(); resolve(false); });
    });
  } catch {
    return false;
  }
}

const LDAP_CONFIGURED = !!process.env.LDAP_SETTING_1_USERNAME;

/**
 * Integration Test: LDAP User Sync
 * 
 * Tests the complete LDAP authentication flow including:
 * - LDAP authentication
 * - Automatic user creation in database
 * - Email extraction from LDAP
 * - Automatic role assignment (ldap_default_role)
 * - Provider tracking in JWT
 * 
 * NOTE: Requires LDAP server accessible (VPN if needed)
 */

const LDAP_TEST_USER = {
  username: process.env.LDAP_SETTING_1_USERNAME,
  password: process.env.LDAP_SETTING_1_PASSWORD,
  expectedEmail: process.env.LDAP_SETTING_1_EXPECTED_EMAIL,
  application: process.env.LDAP_SETTING_1_APPLICATION,
  expectedRole: process.env.LDAP_SETTING_1_EXPECTED_ROLE
};

describe.skipIf(!LDAP_CONFIGURED)('LDAP User Sync - Integration Test', () => {
  let app: any;
  let pool: Pool;
  let ldapReachable = false;

  beforeAll(async () => {
    ldapReachable = await isLdapReachable();
    if (!ldapReachable) return;

    // Setup database connection
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: Number.parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'auth_db',
      user: process.env.PG_USER,
      password: process.env.PG_PASSWORD
    });

    // Create Express app with PostgreSQL (not in-memory)
    const appContext = await createApp(true);
    app = appContext.app;
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async (ctx) => {
    if (!ldapReachable) return ctx.skip();
    // Clean up test user before each test
    await pool.query('DELETE FROM auth.users WHERE username = $1', [LDAP_TEST_USER.username]);
  });

  it('should authenticate LDAP user and create in database with correct email', async () => {
    // Verify user doesn't exist
    const userBefore = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1', 
      [LDAP_TEST_USER.username]
    );
    expect(userBefore.rows).toHaveLength(0);

    // Login with LDAP credentials
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: LDAP_TEST_USER.password,
        applicationName: LDAP_TEST_USER.application
      });

    // Should return 200 with tokens in cookies
    expect(response.status).toBe(200);
    const cookies = response.headers['set-cookie'] as string[] | undefined;
    const accessToken = cookies
      ?.map(c => /^accessToken=([^;]+)/.exec(c)?.[1])
      .find(Boolean) ?? '';
    const refreshToken = cookies
      ?.map(c => /^refreshToken=([^;]+)/.exec(c)?.[1])
      .find(Boolean);
    expect(accessToken).toBeTruthy();
    expect(refreshToken).toBeTruthy();
    expect(response.body.user).toMatchObject({
      username: LDAP_TEST_USER.username,
      authProvider: 'LDAP_SETTING_1'
    });

    // Decode JWT to verify content
    const decodedToken = decodeURIComponent(accessToken);
    const payload = JSON.parse(
      Buffer.from(decodedToken.split('.')[1], 'base64').toString()
    );

    expect(payload).toMatchObject({
      username: LDAP_TEST_USER.username,
      authProvider: 'LDAP_SETTING_1',
      applicationName: LDAP_TEST_USER.application,
      roles: [LDAP_TEST_USER.expectedRole]
    });

    // Verify user was created in database
    const userAfter = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1',
      [LDAP_TEST_USER.username]
    );

    expect(userAfter.rows).toHaveLength(1);
    const user = userAfter.rows[0];
    
    // Check user properties
    expect(user.username).toBe(LDAP_TEST_USER.username);
    expect(user.email).toBe(LDAP_TEST_USER.expectedEmail); // ✅ Email from LDAP
    expect(user.is_active).toBe(true);

    // Verify role assignment
    const roleAssignment = await pool.query(
      `SELECT r.name as role_name, a.name as app_name
       FROM auth.user_application_roles uar
       JOIN auth.roles r ON uar.role_id = r.id
       JOIN auth.applications a ON uar.application_id = a.id
       WHERE uar.user_id = $1`,
      [user.id]
    );

    expect(roleAssignment.rows).toHaveLength(1);
    expect(roleAssignment.rows[0]).toMatchObject({
      role_name: LDAP_TEST_USER.expectedRole,
      app_name: LDAP_TEST_USER.application
    });
  });

  it('should not create user if LDAP authentication fails', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: 'WRONG_PASSWORD',
        applicationName: LDAP_TEST_USER.application
      });

    // Invalid credentials should return 400 or 401
    expect([400, 401]).toContain(response.status);

    // Verify user was NOT created
    const user = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1',
      [LDAP_TEST_USER.username]
    );
    expect(user.rows).toHaveLength(0);
  });

  it('should not create user if application does not allow LDAP sync', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: LDAP_TEST_USER.password,
        applicationName: 'auth_APP' // This app has allow_ldap_sync=FALSE
      });

    // LDAP auth succeeds but user creation is blocked
    // Currently returns 500 (could be improved to 403)
    expect([403, 500]).toContain(response.status);
    expect(response.body.error).toBeTruthy();

    // Verify user was NOT created
    const user = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1',
      [LDAP_TEST_USER.username]
    );
    expect(user.rows).toHaveLength(0);
  });

  it('should authenticate existing LDAP user and assign missing role', async () => {
    // Pre-create user without role
    const insertResult = await pool.query(
      `INSERT INTO auth.users (username, email, password_hash, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [LDAP_TEST_USER.username, 'temp@example.com', 'dummy_hash']
    );
    const userId = insertResult.rows[0].id;

    // Login (user exists but has no role in secHTTPS_APP)
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: LDAP_TEST_USER.password,
        applicationName: LDAP_TEST_USER.application
      });

    expect(response.status).toBe(200);

    // Verify role was assigned
    const roleAssignment = await pool.query(
      `SELECT r.name as role_name
       FROM auth.user_application_roles uar
       JOIN auth.roles r ON uar.role_id = r.id
       WHERE uar.user_id = $1`,
      [userId]
    );

    expect(roleAssignment.rows).toHaveLength(1);
    expect(roleAssignment.rows[0].role_name).toBe(LDAP_TEST_USER.expectedRole);
  });

  it('should use email from LDAP and not generate fallback', async () => {
    await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: LDAP_TEST_USER.password,
        applicationName: LDAP_TEST_USER.application
      });

    const user = await pool.query(
      'SELECT email FROM auth.users WHERE username = $1',
      [LDAP_TEST_USER.username]
    );

    // Should NOT be @ldap.local fallback
    expect(user.rows[0].email).not.toContain('@ldap.local');
    expect(user.rows[0].email).toBe(LDAP_TEST_USER.expectedEmail);
  });

  it('should not create user when applicationName is not provided', async () => {
    const response = await request(app)
      .post('/auth/login')
      .send({
        username: LDAP_TEST_USER.username,
        password: LDAP_TEST_USER.password
        // applicationName is omitted
      });

    // LDAP authenticates successfully but user creation is blocked
    // because we cannot verify allow_ldap_sync without applicationName
    // Currently returns 500 (could be improved to 403)
    expect([401, 403, 500]).toContain(response.status);
    expect(response.body.error).toBeTruthy();

    // Verify user was NOT created in database
    const user = await pool.query(
      'SELECT * FROM auth.users WHERE username = $1',
      [LDAP_TEST_USER.username]
    );
    expect(user.rows).toHaveLength(0);
  });
});
