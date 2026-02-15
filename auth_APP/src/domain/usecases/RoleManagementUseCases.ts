import { Pool } from 'pg';
import { AssignRoleDTO, RevokeRoleDTO, RoleOperationResult } from '../../types/rbac';

/**
 * Assign Role Use Case
 * Assigns a role to a user in a specific application
 * Invalidates user cache after assignment
 */
export class AssignRoleUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly invalidateCache: (userId: string) => void
  ) {}

  async execute(dto: AssignRoleDTO): Promise<RoleOperationResult> {
    const { userId, applicationName, roleName, grantedBy, expiresAt } = dto;

    // Check if user exists
    const userResult = await this.pool.query(
      'SELECT id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Check if application exists
    const appResult = await this.pool.query(
      'SELECT id FROM applications WHERE name = $1 AND is_active = true',
      [applicationName]
    );

    if (appResult.rows.length === 0) {
      throw new Error(`Application '${applicationName}' not found or inactive`);
    }

    const applicationId = appResult.rows[0].id;

    // Check if role exists in this application
    const roleResult = await this.pool.query(
      'SELECT id FROM roles WHERE name = $1 AND application_id = $2',
      [roleName, applicationId]
    );

    if (roleResult.rows.length === 0) {
      throw new Error(`Role '${roleName}' not found in application '${applicationName}'`);
    }

    const roleId = roleResult.rows[0].id;

    // Assign role (ON CONFLICT DO NOTHING to avoid duplicates)
    await this.pool.query(
      `INSERT INTO user_application_roles (user_id, application_id, role_id, granted_by, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, application_id, role_id) DO UPDATE
       SET granted_at = NOW(), granted_by = $4, expires_at = $5`,
      [userId, applicationId, roleId, grantedBy || null, expiresAt || null]
    );

    // Invalidate user cache
    this.invalidateCache(userId);

    console.log(`[RBAC] Assigned role '${roleName}' to user ${userId} in ${applicationName}`);

    return {
      success: true,
      message: `Role '${roleName}' assigned to user ${userId} in '${applicationName}'`
    };
  }
}

/**
 * Revoke Role Use Case
 * Revokes a role from a user in a specific application
 * Invalidates user cache after revocation
 */
export class RevokeRoleUseCase {
  constructor(
    private readonly pool: Pool,
    private readonly invalidateCache: (userId: string) => void
  ) {}

  async execute(dto: RevokeRoleDTO): Promise<RoleOperationResult> {
    const { userId, applicationName, roleName } = dto;

    // Delete role assignment
    const result = await this.pool.query(
      `DELETE FROM user_application_roles uar
       USING roles r, applications a
       WHERE uar.role_id = r.id
         AND uar.application_id = a.id
         AND uar.user_id = $1
         AND a.name = $2
         AND r.name = $3
       RETURNING uar.id`,
      [userId, applicationName, roleName]
    );

    const revokedCount = result.rowCount || 0;

    // Invalidate user cache even if no roles were revoked
    this.invalidateCache(userId);

    console.log(`[RBAC] Revoked role '${roleName}' from user ${userId} in ${applicationName}`);

    return {
      success: true,
      revokedCount,
      message: revokedCount > 0 
        ? `Role '${roleName}' revoked from user ${userId}` 
        : `Role '${roleName}' was not assigned to user ${userId}`
    };
  }

  /**
   * Revokes all roles from a user in a specific application
   */
  async revokeAllRolesInApp(userId: string, applicationName: string): Promise<RoleOperationResult> {
    const result = await this.pool.query(
      `DELETE FROM user_application_roles uar
       USING applications a
       WHERE uar.application_id = a.id
         AND uar.user_id = $1
         AND a.name = $2
       RETURNING uar.id`,
      [userId, applicationName]
    );

    const deletedCount = result.rowCount || 0;

    // Invalidate user cache
    this.invalidateCache(userId);

    console.log(`[RBAC] Revoked ${deletedCount} roles from user ${userId} in ${applicationName}`);

    return {
      success: true,
      revokedCount: deletedCount,
      message: `Revoked ${deletedCount} roles from user ${userId} in '${applicationName}'`
    };
  }

  /**
   * Revokes all roles from a user across all applications
   */
  async revokeAllRoles(userId: string): Promise<RoleOperationResult> {
    const result = await this.pool.query(
      'DELETE FROM user_application_roles WHERE user_id = $1 RETURNING id',
      [userId]
    );

    const deletedCount = result.rowCount || 0;

    // Invalidate user cache
    this.invalidateCache(userId);

    console.log(`[RBAC] Revoked all ${deletedCount} roles from user ${userId}`);

    return {
      success: true,
      revokedCount: deletedCount,
      message: `Revoked all ${deletedCount} roles from user ${userId}`
    };
  }
}
