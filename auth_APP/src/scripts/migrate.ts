import dotenv from 'dotenv';
import { closeDatabaseConnection } from '../infrastructure/database/connection';
import { DatabaseMigrator } from '../infrastructure/database/migrator';

// Load environment variables from .env
dotenv.config();

// Using IIFE for async execution in CommonJS
// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  try {
    console.log('🚀 Starting database migrations...');
    
    // Note: We don't call connectDatabase() here because:
    // - Migration 000 needs to connect to postgres (not auth_db)
    // - Migration 001+ needs to connect to auth_db (which doesn't exist yet)
    // DatabaseMigrator handles connections internally per migration type
    
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
