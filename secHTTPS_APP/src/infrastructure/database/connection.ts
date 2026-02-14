import dotenv from 'dotenv';
import { Pool, PoolConfig } from 'pg';

dotenv.config();

let pool: Pool | null = null;

const getConfig = (): PoolConfig => {
  const host = process.env.PG_HOST;
  const port = Number.parseInt(process.env.PG_PORT || '5432', 10);
  const database = process.env.PG_DATABASE;
  const user = process.env.PG_USER;
  const password = process.env.PG_PASSWORD;

  // Validate required environment variables
  if (!host || !database || !user || !password) {
    throw new Error(
      'Missing required PostgreSQL environment variables: PG_HOST, PG_DATABASE, PG_USER, PG_PASSWORD'
    );
  }

  return {
    host,
    port,
    database,
    user,
    password,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
};

export const getPool = (): Pool => {
  if (!pool) {
    const config = getConfig();
    pool = new Pool(config);
  }
  return pool;
};

export const connectDatabase = async (): Promise<void> => {
  try {
    const currentPool = getPool();
    const client = await currentPool.connect();
    client.release();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

export const closeDatabaseConnection = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('🔐 Database connection closed');
  }
};

// Export pool getter for backwards compatibility
export { getPool as pool };

