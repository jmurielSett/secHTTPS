import dotenv from 'dotenv';
import { Pool } from 'pg';
import { PasswordHasher } from '../infrastructure/security/PasswordHasher';
import { logError } from '../utils/logger';

// Load environment variables
dotenv.config();

/**
 * Script to create a viewer user (read-only) in auth_db
 * This user will have access to secHTTPS_APP with viewer role
 * 
 * Usage: ts-node src/scripts/createViewerUser.ts
 */

interface ViewerUserConfig {
  username: string;
  email: string;
  password: string;
  applicationName: string;
  roleName: string;
}

async function createViewerUser(config: ViewerUserConfig): Promise<void> {
  // Database connection configuration
  const pool = new Pool({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'auth',
    password: process.env.PG_PASSWORD,
    database: process.env.PG_DATABASE || 'auth_db',
  });

  try {
    console.log('🔧 Connecting to database...');
    console.log(`   Host: ${process.env.PG_HOST}:${process.env.PG_PORT}`);
    console.log(`   Database: ${process.env.PG_DATABASE}`);
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Check if user already exists
    console.log(`🔍 Checking if user '${config.username}' exists...`);
    const existingUser = await pool.query(
      'SELECT id, username FROM users WHERE username = $1',
      [config.username]
    );

    if (existingUser.rows.length > 0) {
      console.log(`⚠️  User '${config.username}' already exists with ID ${existingUser.rows[0].id}`);
      console.log('   Skipping user creation.\n');
      await pool.end();
      return;
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHasher = new PasswordHasher();
    const passwordHash = await passwordHasher.hash(config.password);
    console.log('✅ Password hashed\n');

    // Create user
    console.log(`👤 Creating user '${config.username}'...`);
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [config.username, config.email, passwordHash]
    );

    const userId = userResult.rows[0].id;
    console.log(`✅ User created with ID: ${userId}`);
    console.log(`   Username: ${userResult.rows[0].username}`);
    console.log(`   Email: ${config.email}\n`);

    // Verify application exists
    console.log(`🔍 Verifying application '${config.applicationName}'...`);
    const appResult = await pool.query(
      'SELECT id, name FROM applications WHERE name = $1',
      [config.applicationName]
    );

    if (appResult.rows.length === 0) {
      throw new Error(`Application '${config.applicationName}' not found in database`);
    }
    console.log(`✅ Application found: ${appResult.rows[0].name} (ID: ${appResult.rows[0].id})\n`);

    // Verify role exists
    console.log(`🔍 Verifying role '${config.roleName}' in application '${config.applicationName}'...`);
    const roleResult = await pool.query(
      `SELECT r.id, r.name 
       FROM roles r 
       JOIN applications a ON r.application_id = a.id 
       WHERE a.name = $1 AND r.name = $2`,
      [config.applicationName, config.roleName]
    );

    if (roleResult.rows.length === 0) {
      throw new Error(`Role '${config.roleName}' not found for application '${config.applicationName}'`);
    }
    console.log(`✅ Role found: ${roleResult.rows[0].name} (ID: ${roleResult.rows[0].id})\n`);

    // Assign role to user
    console.log(`🔗 Assigning role '${config.roleName}' to user '${config.username}' in application '${config.applicationName}'...`);
    await pool.query(
      `INSERT INTO user_application_roles (user_id, application_id, role_id)
       SELECT $1, 
         (SELECT id FROM applications WHERE name = $2),
         (SELECT id FROM roles WHERE name = $3 
          AND application_id = (SELECT id FROM applications WHERE name = $2))
       WHERE NOT EXISTS (
         SELECT 1 FROM user_application_roles 
         WHERE user_id = $1 
           AND application_id = (SELECT id FROM applications WHERE name = $2)
           AND role_id = (SELECT id FROM roles WHERE name = $3 
                          AND application_id = (SELECT id FROM applications WHERE name = $2))
       )`,
      [userId, config.applicationName, config.roleName]
    );
    console.log(`✅ Role assigned successfully\n`);

    // Verify role assignment
    const verifyResult = await pool.query(
      `SELECT u.username, a.name as application, r.name as role
       FROM user_application_roles uar
       JOIN users u ON uar.user_id = u.id
       JOIN applications a ON uar.application_id = a.id
       JOIN roles r ON uar.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    console.log('📊 User roles summary:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ${row.username} → ${row.application}: ${row.role}`);
    });

    console.log('\n✅ User creation completed successfully!');
    console.log('\n📋 Login credentials:');
    console.log(`   Username: ${config.username}`);
    console.log(`   Password: ${config.password}`);
    console.log(`   Application: ${config.applicationName}`);
    console.log(`   Role: ${config.roleName} (read-only access)`);

  } catch (err) {
    console.error('\n❌ Error creating viewer user:');
    logError('Error:', err instanceof Error ? err : undefined);
    throw err;
  } finally {
    await pool.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Configuration for the viewer user
const viewerConfig: ViewerUserConfig = {
  username: 'viewer',
  email: 'viewer@sechttps.local',
  password: 'Viewer123', // Must meet password policy: uppercase, lowercase, number
  applicationName: 'secHTTPS_APP',
  roleName: 'viewer' // Read-only role
};

// Execute script
console.log('🚀 Creating Viewer User for secHTTPS_APP\n');
console.log('═'.repeat(50));

createViewerUser(viewerConfig)
  .then(() => {
    console.log('═'.repeat(50));
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.log('═'.repeat(50));
    console.error('\n💥 Script failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
