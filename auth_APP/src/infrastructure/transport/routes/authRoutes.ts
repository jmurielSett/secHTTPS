import { Router } from 'express';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IPasswordHasher, ITokenService } from '../../../domain/services';
import { LoginUseCase, RefreshTokenUseCase, ValidateTokenUseCase } from '../../../domain/usecases';
import { AuthController } from '../controllers/AuthController';

export function createAuthRouter(
  userRepository: IUserRepository,
  tokenService: ITokenService,
  passwordHasher: IPasswordHasher
): Router {
  const router = Router();

  // Crear instancias de los casos de uso
  const loginUseCase = new LoginUseCase(
    userRepository,
    tokenService,
    passwordHasher
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    userRepository,
    tokenService
  );

  const validateTokenUseCase = new ValidateTokenUseCase(
    tokenService
  );

  // Crear controller con los casos de uso
  const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    validateTokenUseCase
  );

  // Definir rutas
  router.post('/login', (req, res, next) => authController.login(req, res, next));
  router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
  router.post('/validate', (req, res, next) => authController.validate(req, res, next));

  return router;
}
