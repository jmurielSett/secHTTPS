-- Migration: 001_create_rbac_system
-- Description: Creates complete RBAC (Role-Based Access Control) system
--              with applications, users, roles, permissions, and relationships
-- Database: PostgreSQL (portable to MySQL, Oracle, SQL Server with minor changes)

-- ===========================================================================
-- 0. CREATE SCHEMA
-- ===========================================================================

-- Create auth schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS auth;

-- Set search_path to auth schema for this migration
SET search_path TO auth, public;

COMMENT ON SCHEMA auth IS 'Authentication and authorization system schema';

-- ===========================================================================
-- 1. CREATE TABLES
-- ===========================================================================

-- Applications in the ecosystem
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  allow_ldap_sync BOOLEAN DEFAULT FALSE,
  ldap_default_role VARCHAR(50) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE applications IS 'Applications registered in the auth system';
COMMENT ON COLUMN applications.name IS 'Unique application identifier (e.g., secHTTPS_APP)';
COMMENT ON COLUMN applications.allow_ldap_sync IS 'Allow automatic creation of LDAP users for this application';
COMMENT ON COLUMN applications.ldap_default_role IS 'Default role name to assign to new LDAP users (NULL = no role assigned)';

-- Users without hardcoded role
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  auth_provider VARCHAR(100) DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE users IS 'System users - roles assigned through user_application_roles';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (10 rounds)';
COMMENT ON COLUMN users.auth_provider IS 'Authentication provider: DATABASE for local users, LDAP URL for LDAP-synced users';

-- Roles specific to each application
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  application_id INTEGER NOT NULL,
  name VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  UNIQUE (application_id, name)
);

COMMENT ON TABLE roles IS 'Roles defined per application (e.g., admin, viewer, editor)';
COMMENT ON COLUMN roles.name IS 'Role name unique within each application';

-- Catalog of permissions (resources and actions)
CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description VARCHAR(255),
  UNIQUE (resource, action)
);

COMMENT ON TABLE permissions IS 'Catalog of permissions (resource + action pairs)';
COMMENT ON COLUMN permissions.resource IS 'Resource type (e.g., certificates, users, notifications)';
COMMENT ON COLUMN permissions.action IS 'Action on resource (e.g., create, read, update, delete)';

-- Role-Permission relationship (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permissions IS 'Assigns permissions to roles';

-- User-Application-Role assignment
CREATE TABLE IF NOT EXISTS user_application_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  application_id INTEGER NOT NULL,
  role_id INTEGER NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by INTEGER,
  expires_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE (user_id, application_id, role_id)
);

COMMENT ON TABLE user_application_roles IS 'Assigns roles to users for specific applications';
COMMENT ON COLUMN user_application_roles.granted_by IS 'User who granted this role (for audit)';
COMMENT ON COLUMN user_application_roles.expires_at IS 'Optional expiration date for temporary roles';

-- ===========================================================================
-- 2. CREATE INDEXES
-- ===========================================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_roles_app ON roles(application_id);
CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_application_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_app ON user_application_roles(application_id);

-- ===========================================================================
-- 3. SEED DATA - Applications
-- ===========================================================================

INSERT INTO applications (name, description, allow_ldap_sync, ldap_default_role) VALUES
  ('secHTTPS_APP', 'Certificate Management System', TRUE, 'viewer'),
  ('auth_APP', 'Authentication and Authorization Service', FALSE, NULL)
ON CONFLICT (name) DO NOTHING;

-- ===========================================================================
-- 4. SEED DATA - Permissions Catalog
-- ===========================================================================

INSERT INTO permissions (resource, action, description) VALUES
  -- Certificate permissions
  ('certificates', 'create', 'Create new certificates'),
  ('certificates', 'read', 'View certificates'),
  ('certificates', 'update', 'Modify existing certificates'),
  ('certificates', 'delete', 'Delete certificates'),
  -- Notification permissions
  ('notifications', 'send', 'Send notifications'),
  ('notifications', 'read', 'View notifications'),
  -- User permissions
  ('users', 'create', 'Create new users'),
  ('users', 'read', 'View user information'),
  ('users', 'update', 'Modify user information'),
  ('users', 'delete', 'Delete users'),
  -- Role permissions
  ('roles', 'manage', 'Create and assign roles')
ON CONFLICT (resource, action) DO NOTHING;

-- ===========================================================================
-- 5. SEED DATA - Roles for secHTTPS_APP
-- ===========================================================================

INSERT INTO roles (application_id, name, description) VALUES
  ((SELECT id FROM applications WHERE name = 'secHTTPS_APP'), 
   'admin', 
   'Full access to certificates and notifications'),
  ((SELECT id FROM applications WHERE name = 'secHTTPS_APP'), 
   'viewer', 
   'Read-only access to certificates'),
  ((SELECT id FROM applications WHERE name = 'secHTTPS_APP'), 
   'editor', 
   'Create and edit certificates'),
  ((SELECT id FROM applications WHERE name = 'secHTTPS_APP'), 
   'auditor', 
   'Read certificates and view notifications')
ON CONFLICT (application_id, name) DO NOTHING;

-- ===========================================================================
-- 6. SEED DATA - Roles for auth_APP
-- ===========================================================================

INSERT INTO roles (application_id, name, description) VALUES
  ((SELECT id FROM applications WHERE name = 'auth_APP'), 
   'super_admin', 
   'Manage all users and roles'),
  ((SELECT id FROM applications WHERE name = 'auth_APP'), 
   'user_manager', 
   'Create and edit users')
ON CONFLICT (application_id, name) DO NOTHING;

-- ===========================================================================
-- 7. ASSIGN PERMISSIONS - secHTTPS_APP admin role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'admin' 
   AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP')),
  p.id
FROM permissions p
WHERE p.resource IN ('certificates', 'notifications')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 8. ASSIGN PERMISSIONS - secHTTPS_APP viewer role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'viewer' 
   AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP')),
  p.id
FROM permissions p
WHERE p.resource = 'certificates' AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 9. ASSIGN PERMISSIONS - secHTTPS_APP editor role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'editor' 
   AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP')),
  p.id
FROM permissions p
WHERE p.resource = 'certificates' AND p.action IN ('create', 'read', 'update')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 10. ASSIGN PERMISSIONS - secHTTPS_APP auditor role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'auditor' 
   AND application_id = (SELECT id FROM applications WHERE name = 'secHTTPS_APP')),
  p.id
FROM permissions p
WHERE p.resource IN ('certificates', 'notifications') AND p.action = 'read'
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 11. ASSIGN PERMISSIONS - auth_APP super_admin role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'super_admin' 
   AND application_id = (SELECT id FROM applications WHERE name = 'auth_APP')),
  p.id
FROM permissions p
WHERE p.resource IN ('users', 'roles')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 12. ASSIGN PERMISSIONS - auth_APP user_manager role
-- ===========================================================================

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  (SELECT id FROM roles WHERE name = 'user_manager' 
   AND application_id = (SELECT id FROM applications WHERE name = 'auth_APP')),
  p.id
FROM permissions p
WHERE p.resource = 'users' AND p.action IN ('create', 'read', 'update')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- 13. SEED ADMIN USER (Handled programmatically in app.ts)
-- ===========================================================================

-- IMPORTANT: Admin user is NOT seeded in this migration file for security reasons.
-- The admin user will be created automatically on first startup by app.ts using 
-- environment variables: ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
--
-- This approach ensures:
-- - No passwords or hashes in version control
-- - Each environment (dev/staging/prod) can have different credentials
-- - Passwords can be rotated without modifying SQL files
--
-- The seed process in app.ts will:
-- 1. Check if admin user exists
-- 2. Create user with credentials from .env if not exists
-- 3. Assign 'admin' role in secHTTPS_APP
-- 4. Assign 'super_admin' role in auth_APP

-- ===========================================================================
-- 14. VERIFICATION QUERIES (for debugging)
-- ===========================================================================

-- Uncomment to see results after migration:
/*
SELECT 'Applications:' AS info;
SELECT id, name, is_active FROM applications;

SELECT 'Roles:' AS info;
SELECT r.id, a.name AS app, r.name AS role, r.description 
FROM roles r 
JOIN applications a ON r.application_id = a.id;

SELECT 'User Roles:' AS info;
SELECT u.username, a.name AS app, r.name AS role
FROM user_application_roles uar
JOIN users u ON uar.user_id = u.id
JOIN applications a ON uar.application_id = a.id
JOIN roles r ON uar.role_id = r.id;

SELECT 'Admin Permissions:' AS info;
SELECT a.name AS app, r.name AS role, p.resource, p.action
FROM user_application_roles uar
JOIN users u ON uar.user_id = u.id
JOIN applications a ON uar.application_id = a.id
JOIN roles r ON uar.role_id = r.id
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE u.username = 'admin'
ORDER BY a.name, p.resource, p.action;
*/
