import dotenv from 'dotenv';
import { closeDatabaseConnection, connectDatabase } from '../infrastructure/database/connection';
import { DatabaseMigrator } from '../infrastructure/database/migrator';

// Load environment variables from .env
dotenv.config();

// Using IIFE for async execution in CommonJS
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    await connectDatabase();
    
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();
    
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await closeDatabaseConnection();
  }
})();
