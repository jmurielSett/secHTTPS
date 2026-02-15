import { Router } from 'express';
import { Pool } from 'pg';
import { VerifyUserAccessUseCase } from '../../../domain/usecases/VerifyUserAccessUseCase';
import { AdminController } from '../controllers/AdminController';

/**
 * Creates admin routes for role management
 * @param pool PostgreSQL connection pool
 * @param verifyAccessUseCase Use case for verifying access (includes cache)
 */
export function createAdminRouter(
  pool: Pool,
  verifyAccessUseCase: VerifyUserAccessUseCase
): Router {
  const router = Router();
  const controller = new AdminController(pool, verifyAccessUseCase);

  // Role management endpoints
  router.post('/roles/assign', controller.assignRole.bind(controller));
  router.post('/roles/revoke', controller.revokeRole.bind(controller));
  router.post('/roles/revoke-all-in-app', controller.revokeAllRolesInApp.bind(controller));
  router.post('/roles/revoke-all', controller.revokeAllRoles.bind(controller));

  // Cache management
  router.post('/cache/invalidate', controller.invalidateUserCache.bind(controller));

  return router;
}
