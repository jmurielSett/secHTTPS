import dotenv from 'dotenv';
import { closeDatabaseConnection, connectDatabase, getPool } from '../infrastructure/database/connection';

// Load environment variables from .env
dotenv.config();

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...');
    
    await connectDatabase();
    
    // Drop auth schema with CASCADE (drops all tables, indexes, etc.)
    await getPool().query('DROP SCHEMA IF EXISTS auth CASCADE;');
    
    // Drop migrations table if it exists in public schema
    await getPool().query('DROP TABLE IF EXISTS public.migrations CASCADE;');
    
    console.log('✅ Database reset completed successfully');
    console.log('💡 Run "npm run db:migrate" to recreate the schema and tables');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
resetDatabase();
