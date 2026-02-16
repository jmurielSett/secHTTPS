import { NextFunction, Request, Response } from 'express';
import {
    CreateUserUseCase,
    DeleteUserUseCase,
    GetUserByIdUseCase,
    GetUsersUseCase,
    UpdateUserUseCase
} from '../../../domain/usecases';

/**
 * User Admin Controller
 * Manages CRUD operations for users (admin operations)
 */
export class UserAdminController {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly getUserByIdUseCase: GetUserByIdUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase
  ) {}

  /**
   * POST /admin/users
   * Creates a new user (admin operation)
   * Body: { username, email, password }
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'username, email, and password are required'
          }
        });
        return;
      }

      // Execute use case
      const user = await this.createUserUseCase.execute({
        username,
        email,
        password
      });

      res.status(201).json({
        message: 'User created successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users
   * Retrieves all users
   */
  async getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.getUsersUseCase.execute();

      res.status(200).json({
        users: users.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }))
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /admin/users/:id
   * Retrieves a specific user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      const user = await this.getUserByIdUseCase.execute(id);

      res.status(200).json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /admin/users/:id
   * Updates a user
   * Body: { username?, email?, password? }
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { username, email, password } = req.body;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      // At least one field must be provided
      if (!username && !email && !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one field (username, email, or password) must be provided'
          }
        });
        return;
      }

      const user = await this.updateUserUseCase.execute({
        userId: id,
        username,
        email,
        password
      });

      res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /admin/users/:id
   * Deletes a user
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      if (!id || typeof id !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID is required'
          }
        });
        return;
      }

      await this.deleteUserUseCase.execute(id);

      res.status(200).json({
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}
