import { Router } from 'express';
import { Pool } from 'pg';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordHasher } from '../../../domain/services';
import {
  CreateUserUseCase,
  DeleteUserUseCase,
  GetUserByIdUseCase,
  GetUsersUseCase,
  UpdateUserUseCase
} from '../../../domain/usecases';
import { VerifyUserAccessUseCase } from '../../../domain/usecases/VerifyUserAccessUseCase';
import { AdminController } from '../controllers/AdminController';
import { UserAdminController } from '../controllers/UserAdminController';

/**
 * Creates admin routes for role management and user management
 * @param pool PostgreSQL connection pool
 * @param verifyAccessUseCase Use case for verifying access (includes cache)
 * @param userRepository User repository
 * @param passwordHasher Password hasher
 */
export function createAdminRouter(
  pool: Pool,
  verifyAccessUseCase: VerifyUserAccessUseCase,
  userRepository: IUserRepository,
  passwordHasher: IPasswordHasher
): Router {
  const router = Router();
  
  // Role management controller
  const adminController = new AdminController(pool, verifyAccessUseCase);

  // User management controller
  const createUserUseCase = new CreateUserUseCase(userRepository, passwordHasher);
  const getUsersUseCase = new GetUsersUseCase(userRepository);
  const getUserByIdUseCase = new GetUserByIdUseCase(userRepository);
  const updateUserUseCase = new UpdateUserUseCase(userRepository, passwordHasher);
  const deleteUserUseCase = new DeleteUserUseCase(userRepository);
  
  const userAdminController = new UserAdminController(
    createUserUseCase,
    getUsersUseCase,
    getUserByIdUseCase,
    updateUserUseCase,
    deleteUserUseCase
  );

  // Role management endpoints
  router.post('/roles/assign', adminController.assignRole.bind(adminController));
  router.post('/roles/revoke', adminController.revokeRole.bind(adminController));
  router.post('/roles/revoke-all-in-app', adminController.revokeAllRolesInApp.bind(adminController));
  router.post('/roles/revoke-all', adminController.revokeAllRoles.bind(adminController));

  // Cache management
  router.post('/cache/invalidate', adminController.invalidateUserCache.bind(adminController));

  // User management endpoints
  router.post('/users', userAdminController.createUser.bind(userAdminController));
  router.get('/users', userAdminController.getUsers.bind(userAdminController));
  router.get('/users/:id', userAdminController.getUserById.bind(userAdminController));
  router.put('/users/:id', userAdminController.updateUser.bind(userAdminController));
  router.delete('/users/:id', userAdminController.deleteUser.bind(userAdminController));

  return router;
}
