/**
 * RBAC (Role-Based Access Control) Types
 * Types for role management and authorization
 */

/**
 * DTO for assigning a role to a user
 */
export interface AssignRoleDTO {
  userId: string;
  applicationName: string;
  roleName: string;
  grantedBy?: string; // User ID who granted this role
  expiresAt?: Date;   // Optional expiration date
}

/**
 * DTO for revoking a role from a user
 */
export interface RevokeRoleDTO {
  userId: string;
  applicationName: string;
  roleName: string;
}

/**
 * Result of role management operations
 */
export interface RoleOperationResult {
  success: boolean;
  revokedCount?: number;
  message?: string;
}
