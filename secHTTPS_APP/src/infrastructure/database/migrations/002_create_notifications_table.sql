-- Migration: 002_create_notifications_table
-- Description: Creates notifications and notification_recipient_emails tables
-- Database: PostgreSQL

-- Set search_path to sechttps schema
SET search_path TO sechttps, public;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(36) PRIMARY KEY,
  certificate_id VARCHAR(36) NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL,
  subject VARCHAR(500) NOT NULL,
  expiration_status_at_time VARCHAR(20) NOT NULL 
    CHECK (expiration_status_at_time IN ('NORMAL', 'WARNING', 'EXPIRED')),
  result VARCHAR(20) NOT NULL CHECK (result IN ('SENT', 'ERROR', 'FORCE')),
  error_message VARCHAR(2000),
  CONSTRAINT fk_notif_cert FOREIGN KEY (certificate_id) 
    REFERENCES certificates(id) ON DELETE CASCADE
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_cert ON notifications(certificate_id);
CREATE INDEX IF NOT EXISTS idx_notifications_result ON notifications(result);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(expiration_status_at_time);
CREATE INDEX IF NOT EXISTS idx_notifications_sent_at ON notifications(sent_at);

-- Create table for notification recipient emails (1:N relationship)
-- Using composite primary key to prevent duplicates and optimize queries
CREATE TABLE IF NOT EXISTS notification_recipient_emails (
  notification_id VARCHAR(36) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  CONSTRAINT fk_notif_email_notif FOREIGN KEY (notification_id) 
    REFERENCES notifications(id) ON DELETE CASCADE,
  PRIMARY KEY (notification_id, recipient_email)
);

-- Create index to optimize lookups by notification
CREATE INDEX IF NOT EXISTS idx_notif_emails_notif_id ON notification_recipient_emails(notification_id);

-- Add comments for documentation
COMMENT ON TABLE notifications IS 'Email notifications sent for certificate expiration warnings';
COMMENT ON TABLE notification_recipient_emails IS 'Recipient email addresses for each notification (normalized 1:N)';
