-- Migration: 000_create_database
-- Description: Creates sechttps_db database and sechttps user
-- Note: This migration is executed against postgres database first
-- Template variables: {{PG_USER}}, {{PG_PASSWORD}}, {{PG_DATABASE}}

-- ===========================================================================
-- 1. CREATE USER
-- ===========================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '{{PG_USER}}') THEN
    CREATE USER {{PG_USER}} WITH PASSWORD '{{PG_PASSWORD}}';
  END IF;
END
$$;

-- ===========================================================================
-- 2. CONFIGURE DEFAULT SEARCH_PATH FOR USER
-- ===========================================================================

-- Set default search_path to 'sechttps, public' for the user
-- This eliminates the need to prefix tables with 'sechttps.' in queries
ALTER USER {{PG_USER}} SET search_path TO sechttps, public;

COMMENT ON ROLE {{PG_USER}} IS 'Application user for sechttps_db with default search_path=sechttps,public';
