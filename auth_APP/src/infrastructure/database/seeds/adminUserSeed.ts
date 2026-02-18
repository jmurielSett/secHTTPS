import { Pool } from 'pg';
import { logError, logInfo } from '../../../utils/logger';
import { PasswordHasher } from '../../security/PasswordHasher';

/**
 * Seeds admin user in PostgreSQL with RBAC roles
 * Creates user if not exists and assigns roles in both applications
 */
export async function seedAdminUser(pool: Pool): Promise<void> {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@auth.com';
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required but not set');
  }
  
  try {
    // Check if admin user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    
    if (existingUser.rows.length > 0) {
      logInfo(`✓ Admin user '${username}' already exists`);
      return;
    }
    
    // Hash password with dedicated hasher instance
    const passwordHasher = new PasswordHasher();
    const passwordHash = await passwordHasher.hash(password);
    
    // Create admin user
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [username, email, passwordHash]
    );
    
    const userId = userResult.rows[0].id;
    logInfo(`✓ Admin user '${username}' created with ID ${userId}`);
    
    // Assign 'admin' role in secHTTPS_APP
    await pool.query(`
      INSERT INTO user_application_roles (user_id, application_id, role_id)
      SELECT $1, 
        (SELECT id FROM applications WHERE name = 'secHTTPS_APP'),
        (SELECT id FROM roles WHERE name = 'admin' 
         AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP'))
      WHERE NOT EXISTS (
        SELECT 1 FROM user_application_roles 
        WHERE user_id = $1 
          AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP')
      )
    `, [userId]);
    
    logInfo(`✓ Admin role assigned in secHTTPS_APP`);
    
    // Assign 'super_admin' role in auth_APP
    await pool.query(`
      INSERT INTO user_application_roles (user_id, application_id, role_id)
      SELECT $1,
        (SELECT id FROM applications WHERE name = 'auth_APP'),
        (SELECT id FROM roles WHERE name = 'super_admin' 
         AND application_id = (SELECT id FROM applications WHERE name = 'auth_APP'))
      WHERE NOT EXISTS (
        SELECT 1 FROM user_application_roles 
        WHERE user_id = $1 
          AND application_id = (SELECT id FROM applications WHERE name = 'auth_APP')
      )
    `, [userId]);
    
    logInfo(`✓ Super_admin role assigned in auth_APP`);
    logInfo(`✓ Admin user fully configured with RBAC roles`);
    
  } catch (err) {
    logError('Error seeding admin user:', err instanceof Error ? err : undefined);
    throw err;
  }
}
