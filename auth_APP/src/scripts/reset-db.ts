import dotenv from 'dotenv';
import { closeDatabaseConnection, connectDatabase, getPool } from '../infrastructure/database/connection';
import { logError } from '../utils/logger';

// Load environment variables from .env
dotenv.config();

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...');
    
    await connectDatabase();
    
    // Drop auth schema with CASCADE (drops all tables, indexes, etc.)
    // This will drop auth.migrations table as well since it's in the auth schema
    await getPool().query('DROP SCHEMA IF EXISTS auth CASCADE;');
    
    console.log('✅ Database reset completed successfully');
    console.log('💡 Run "npm run db:migrate" to recreate the schema and tables');
  } catch (err) {
    logError('❌ Database reset failed:', err instanceof Error ? err : undefined);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
resetDatabase();
