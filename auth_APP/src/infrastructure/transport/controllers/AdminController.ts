import { NextFunction, Request, Response } from 'express';
import { Pool } from 'pg';
import { AssignRoleUseCase, RevokeRoleUseCase } from '../../../domain/usecases';
import { VerifyUserAccessUseCase } from '../../../domain/usecases/VerifyUserAccessUseCase';

/**
 * Admin Controller
 * Manages role assignments and revocations
 * Automatically invalidates cache when roles change
 */
export class AdminController {
  private readonly assignRoleUseCase: AssignRoleUseCase;
  private readonly revokeRoleUseCase: RevokeRoleUseCase;

  constructor(
    pool: Pool,
    private readonly verifyAccessUseCase: VerifyUserAccessUseCase
  ) {
    // Create use cases with cache invalidation callback
    const invalidateCache = (userId: string) => {
      this.verifyAccessUseCase.invalidateUserCache(userId);
    };

    this.assignRoleUseCase = new AssignRoleUseCase(pool, invalidateCache);
    this.revokeRoleUseCase = new RevokeRoleUseCase(pool, invalidateCache);
  }

  /**
   * POST /admin/roles/assign
   * Assigns a role to a user in a specific application
   * 
   * Body: { userId, applicationName, roleName, grantedBy?, expiresAt? }
   */
  async assignRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, applicationName, roleName, grantedBy, expiresAt } = req.body;

      // Validate required fields
      if (!userId || !applicationName || !roleName) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId, applicationName, and roleName are required'
          }
        });
        return;
      }

      // Execute use case
      const result = await this.assignRoleUseCase.execute({
        userId,
        applicationName,
        roleName,
        grantedBy,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      res.status(200).json({
        success: result.success,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/roles/revoke
   * Revokes a role from a user in a specific application
   * 
   * Body: { userId, applicationName, roleName }
   */
  async revokeRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, applicationName, roleName } = req.body;

      // Validate required fields
      if (!userId || !applicationName || !roleName) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId, applicationName, and roleName are required'
          }
        });
        return;
      }

      // Execute use case
      const result = await this.revokeRoleUseCase.execute({
        userId,
        applicationName,
        roleName
      });

      res.status(200).json({
        success: result.success,
        message: result.message,
        revokedCount: result.revokedCount
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/roles/revoke-all-in-app
   * Revokes all roles from a user in a specific application
   * 
   * Body: { userId, applicationName }
   */
  async revokeAllRolesInApp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, applicationName } = req.body;

      // Validate required fields
      if (!userId || !applicationName) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId and applicationName are required'
          }
        });
        return;
      }

      // Execute use case
      const result = await this.revokeRoleUseCase.revokeAllRolesInApp(
        userId,
        applicationName
      );

      res.status(200).json({
        success: result.success,
        message: result.message,
        revokedCount: result.revokedCount
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/roles/revoke-all
   * Revokes all roles from a user across all applications
   * 
   * Body: { userId }
   */
  async revokeAllRoles(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body;

      // Validate required fields
      if (!userId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId is required'
          }
        });
        return;
      }

      // Execute use case
      const result = await this.revokeRoleUseCase.revokeAllRoles(userId);

      res.status(200).json({
        success: result.success,
        message: result.message,
        revokedCount: result.revokedCount
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /admin/cache/invalidate
   * Manually invalidates cache for a specific user
   * 
   * Body: { userId }
   */
  async invalidateUserCache(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.body;

      // Validate required fields
      if (!userId) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'userId is required'
          }
        });
        return;
      }

      // Invalidate cache
      const deletedCount = this.verifyAccessUseCase.invalidateUserCache(userId);

      res.status(200).json({
        success: true,
        message: `Invalidated ${deletedCount} cache entries for user ${userId}`,
        deletedCount
      });
    } catch (error) {
      next(error);
    }
  }
}
