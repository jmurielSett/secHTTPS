-- Migration: 003_add_language_to_users
-- Description: Adds language preference column to users table.
--              Default value is 'ca' (Catalan). Supported values: 'ca', 'es'.
-- Note: pg does not support multi-statement queries in a single client.query().
-- Each statement must be sent separately; this file is handled by executeMigration
-- which sends the entire SQL as one call. Use separate migration files for DDL + constraints.

SET search_path TO auth, public;

ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(10) NOT NULL DEFAULT 'ca';

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_language_check;
ALTER TABLE users ADD CONSTRAINT users_language_check CHECK (language IN ('ca', 'es'));

COMMENT ON COLUMN users.language IS 'User preferred language: ca (Catalan, default), es (Spanish)';
