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

-- Create table for certificate responsible emails (1:N relationship)
CREATE TABLE IF NOT EXISTS certificate_responsible_emails (
  id VARCHAR(36) PRIMARY KEY,
  certificate_id VARCHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  CONSTRAINT fk_cert_email_cert FOREIGN KEY (certificate_id) 
    REFERENCES certificates(id) ON DELETE CASCADE
);

-- Create index to optimize email lookups by certificate
CREATE INDEX IF NOT EXISTS idx_cert_emails_cert_id ON certificate_responsible_emails(certificate_id);

-- Add comment for documentation
COMMENT ON TABLE certificates IS 'SSL/TLS certificates managed by the application';
COMMENT ON TABLE certificate_responsible_emails IS 'Responsible email addresses for each certificate (normalized 1:N)';
