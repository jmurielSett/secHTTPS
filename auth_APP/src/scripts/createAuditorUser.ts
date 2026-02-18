import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PasswordHasher } from '../infrastructure/security/PasswordHasher';
import { logError } from '../utils/logger';

dotenv.config();

/**
 * Script to create an auditor user (read certificates + notifications) in auth_db
 * This user will have access to secHTTPS_APP with auditor role
 * 
 * Usage: ts-node src/scripts/createAuditorUser.ts
 */

interface UserConfig {
  username: string;
  email: string;
  password: string;
  applicationName: string;
  roleName: string;
}

async function createUser(config: UserConfig): Promise<void> {
  const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'auth',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE || 'auth_db',
  });

  try {
    console.log('🔧 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [config.username]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  User '${config.username}' already exists`);
      await pool.end();
      return;
    }

    // Create user
    const passwordHasher = new PasswordHasher();
    const passwordHash = await passwordHasher.hash(config.password);

    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      [config.username, config.email, passwordHash]
    );

    const userId = userResult.rows[0].id;
    console.log(`✅ User '${config.username}' created with ID: ${userId}`);

    // Assign role
    await pool.query(
      `INSERT INTO user_application_roles (user_id, application_id, role_id)
       SELECT $1, 
         (SELECT id FROM applications WHERE name = $2),
         (SELECT id FROM roles WHERE name = $3 
          AND application_id = (SELECT id FROM applications WHERE name = $2))`,
      [userId, config.applicationName, config.roleName]
    );

    console.log(`✅ Role '${config.roleName}' assigned\n`);
    console.log('📋 Login credentials:');
    console.log(`   Username: ${config.username}`);
    console.log(`   Password: ${config.password}`);
    console.log(`   Role: ${config.roleName}`);

  } catch (err) {
    logError('Error:', err instanceof Error ? err : undefined);
    throw err;
  } finally {
    await pool.end();
  }
}

const config: UserConfig = {
  username: 'auditor',
  email: 'auditor@sechttps.local',
  password: 'Auditor123',
  applicationName: 'secHTTPS_APP',
  roleName: 'auditor' // Can read certificates and notifications
};

console.log('🚀 Creating Auditor User for secHTTPS_APP\n');
createUser(config)
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch(() => process.exit(1));
