import dotenv from 'dotenv';
import { closeDatabaseConnection, connectDatabase, getPool } from '../infrastructure/database/connection';

// Load environment variables from .env
dotenv.config();

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...');
    
    await connectDatabase();
    
    // Drop all tables in reverse order (due to foreign key constraints)
    await getPool().query('DROP TABLE IF EXISTS users CASCADE;');
    await getPool().query('DROP TABLE IF EXISTS migrations CASCADE;');
    
    console.log('✅ Database reset completed successfully');
    console.log('💡 Run "npm run db:migrate" to recreate the schema');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
resetDatabase();
