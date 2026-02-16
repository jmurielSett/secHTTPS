import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Creates and returns a PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: Number.parseInt(process.env.PG_PORT || '5432'),
      database: process.env.PG_DATABASE || 'auth_db',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      // Redundant safeguard: user already has search_path configured via ALTER USER in migration 000
      // This ensures it's set even if database config is changed manually
      options: '-c search_path=auth,public'
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  return pool;
}

/**
 * Connects to the database and verifies the connection
 */
export async function connectDatabase(): Promise<Pool> {
  const poolInstance = getPool();

  try {
    const client = await poolInstance.connect();
    
    // Verify search_path is correctly configured
    const result = await client.query('SHOW search_path');
    console.log('✅ Connected to PostgreSQL database');
    console.log(`   Search path: ${result.rows[0].search_path}`);
    
    client.release();
    return poolInstance;
  } catch (error) {
    console.error('❌ Failed to connect to PostgreSQL:', error);
    throw error;
  }
}

/**
 * Closes the database connection pool
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔌 PostgreSQL connection pool closed');
  }
}
