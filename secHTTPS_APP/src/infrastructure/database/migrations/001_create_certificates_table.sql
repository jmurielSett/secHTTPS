-- Migration: 001_create_certificates_table
-- Description: Creates certificates and certificate_responsible_contacts tables
-- Database: PostgreSQL

-- ===========================================================================
-- 0. CREATE SCHEMA
-- ===========================================================================

-- Create sechttps schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS sechttps;

-- Set search_path to sechttps schema for this migration
SET search_path TO sechttps, public;

COMMENT ON SCHEMA sechttps IS 'SecHTTPS certificate management system schema';

-- ===========================================================================
-- 1. CREATE TABLES
-- ===========================================================================

-- Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
  id VARCHAR(36) PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  expiration_date DATE NOT NULL,
  server VARCHAR(500) NOT NULL,
  file_path VARCHAR(1000) NOT NULL,
  client VARCHAR(500) NOT NULL,
  config_path VARCHAR(1000) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('ACTIVE', 'DELETED')) DEFAULT 'ACTIVE',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for certificates
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_client ON certificates(client);
CREATE INDEX IF NOT EXISTS idx_certificates_server ON certificates(server);
CREATE INDEX IF NOT EXISTS idx_certificates_expiration ON certificates(expiration_date);

-- Create table for certificate responsible contacts (1:N relationship)
-- Using composite primary key to prevent duplicates and optimize queries
CREATE TABLE IF NOT EXISTS certificate_responsible_contacts (
  certificate_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  language VARCHAR(10) NOT NULL DEFAULT 'es',
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_cert_contact_cert FOREIGN KEY (certificate_id) 
    REFERENCES certificates(id) ON DELETE CASCADE,
  PRIMARY KEY (certificate_id, email)
);

-- Create index to optimize lookups by certificate
CREATE INDEX IF NOT EXISTS idx_cert_contacts_cert_id ON certificate_responsible_contacts(certificate_id);

-- Add comments for documentation
COMMENT ON TABLE certificates IS 'SSL/TLS certificates managed by the application';
COMMENT ON TABLE certificate_responsible_contacts IS 'Responsible contacts for each certificate with language preference (normalized 1:N)';
COMMENT ON COLUMN certificate_responsible_contacts.language IS 'ISO 639-1 language code (es, en, fr, de, etc.)';
