import { closeDatabaseConnection, connectDatabase } from '../infrastructure/database/connection';
import { DatabaseMigrator } from '../infrastructure/database/migrator';

async function runMigrations() {
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
}

runMigrations();
