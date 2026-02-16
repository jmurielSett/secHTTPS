import fs from 'node:fs/promises';
import path from 'node:path';
import { Pool } from 'pg';
import { logError } from '../../utils/logger';
import { getPool } from './connection';

export class DatabaseMigrator {
  private readonly migrationsPath = path.join(__dirname, 'migrations');

  /**
   * Creates a temporary connection pool to postgres database for database creation
   */
  private createAdminPool(): Pool {
    if (!process.env.PG_ADMIN_USER || !process.env.PG_ADMIN_PASSWORD) {
      throw new Error(
        'PG_ADMIN_USER and PG_ADMIN_PASSWORD environment variables are required for database creation migrations'
      );
    }

    return new Pool({
      host: process.env.PG_HOST || 'localhost',
      port: Number.parseInt(process.env.PG_PORT || '5432'),
      database: 'postgres', // Connect to default postgres database
      user: process.env.PG_ADMIN_USER,
      password: process.env.PG_ADMIN_PASSWORD,
      max: 1
    });
  }

  async createMigrationsTable(): Promise<void> {
    // Ensure auth schema exists first
    await getPool().query('CREATE SCHEMA IF NOT EXISTS auth;');
    
    const query = `
      CREATE TABLE IF NOT EXISTS auth.migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    await getPool().query(query);
  }

  async getExecutedMigrations(): Promise<string[]> {
    try {
      const result = await getPool().query('SELECT filename FROM auth.migrations ORDER BY id');
      return result.rows.map((row: { filename: string }) => row.filename);
    } catch (error) {
      // If migrations table doesn't exist yet (error code 42P01), return empty array
      if (error && typeof error === 'object' && 'code' in error && error.code === '42P01') {
        return [];
      }
      // Re-throw any other error
      throw error;
    }
  }

  /**
   * Replaces placeholders in SQL template with environment variables
   */
  private replaceSqlTemplateVariables(sql: string): string {
    return sql
      .replaceAll('{{PG_USER}}', process.env.PG_USER || '')
      .replaceAll('{{PG_PASSWORD}}', process.env.PG_PASSWORD || '')
      .replaceAll('{{PG_DATABASE}}', process.env.PG_DATABASE || '');
  }

  /**
   * Executes database creation migration (000_) against postgres database
   */
  async executeDatabaseCreationMigration(filename: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, filename);
    let sql = await fs.readFile(migrationPath, 'utf-8');
    
    // Replace template variables with environment values
    sql = this.replaceSqlTemplateVariables(sql);
    
    const adminPool = this.createAdminPool();
    const client = await adminPool.connect();
    
    try {
      console.log(`🔧 Executing database creation migration: ${filename}`);
      
      // Execute the user creation part
      await client.query(sql);
      
      // Check if database already exists
      const dbCheck = await client.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [process.env.PG_DATABASE]
      );
      
      if (dbCheck.rows.length === 0) {
        // CREATE DATABASE cannot be executed inside a transaction block
        await client.query(`CREATE DATABASE ${process.env.PG_DATABASE} OWNER ${process.env.PG_USER}`);
        console.log(`✅ Database ${process.env.PG_DATABASE} created`);
      } else {
        console.log(`⏩ Database ${process.env.PG_DATABASE} already exists`);
      }
      
      // Grant privileges
      await client.query(`GRANT ALL PRIVILEGES ON DATABASE ${process.env.PG_DATABASE} TO ${process.env.PG_USER}`);
      
      console.log(`✅ Migration ${filename} executed successfully`);
    } catch (err) {
      logError(`❌ Migration ${filename} failed:`, err instanceof Error ? err : undefined);
      throw err;
    } finally {
      client.release();
      await adminPool.end();
    }
  }

  /**
   * Executes regular migration against the application database
   */
  async executeMigration(filename: string): Promise<void> {
    const migrationPath = path.join(this.migrationsPath, filename);
    const sql = await fs.readFile(migrationPath, 'utf-8');
    
    const client = await getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO auth.migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      console.log(`✅ Migration ${filename} executed successfully`);
    } catch (err) {
      await client.query('ROLLBACK');
      logError(`❌ Migration ${filename} failed:`, err instanceof Error ? err : undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async runMigrations(): Promise<void> {
    const migrationFiles = await fs.readdir(this.migrationsPath);
    const sqlMigrations = migrationFiles
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));
    
    // Separate database creation migrations (000_) from regular migrations
    const dbCreationMigrations = sqlMigrations.filter(file => file.startsWith('000_'));
    const regularMigrations = sqlMigrations.filter(file => !file.startsWith('000_'));
    
    // Execute database creation migrations first (against postgres database)
    for (const filename of dbCreationMigrations) {
      await this.executeDatabaseCreationMigration(filename);
    }
    
    // Now we can create migrations table and execute regular migrations
    if (regularMigrations.length > 0) {
      await this.createMigrationsTable();
      const executedMigrations = await this.getExecutedMigrations();
      
      for (const filename of regularMigrations) {
        if (executedMigrations.includes(filename)) {
          console.log(`⏩ Migration ${filename} already executed`);
        } else {
          await this.executeMigration(filename);
        }
      }
    }
    
    console.log('🎯 All migrations completed');
  }
}
