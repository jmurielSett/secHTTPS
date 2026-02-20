-- Migration: 002_add_auth_provider
-- Description: Adds auth_provider column to users table to distinguish
--              local DB users (DATABASE) from LDAP-synced users (LDAP URL).
-- Note: pg does not support multi-statement queries in a single client.query().
-- Each statement must be sent separately; this file is handled by executeMigration
-- which sends the entire SQL as one call. Use separate migration files for DML.

SET search_path TO auth, public;

-- Add column idempotently (DDL only - no DML in this file)
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(100) DEFAULT NULL;

COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: DATABASE for local users, LDAP URL for LDAP-synced users (NULL = legacy row)';
