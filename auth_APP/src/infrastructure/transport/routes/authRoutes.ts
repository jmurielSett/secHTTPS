import { Router } from 'express';
import { Pool } from 'pg';
import { IApplicationRepository } from '../../../domain/repositories/IApplicationRepository';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuthenticationProvider, IPasswordHasher, ITokenService } from '../../../domain/services';
import {
    AssignRoleUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    RegisterUserUseCase,
    ValidateTokenUseCase
} from '../../../domain/usecases';
import { logInfo } from '../../../utils/logger';
import { InMemoryApplicationRepository } from '../../persistence/InMemoryApplicationRepository';
import { PostgresApplicationRepository } from '../../persistence/PostgresApplicationRepository';
import { DatabaseAuthenticationProvider } from '../../security/DatabaseAuthenticationProvider';
import { AUTH_CONFIG, LDAP_CONFIG } from '../../security/ldap.config';
import { LDAPAuthenticationProvider } from '../../security/LDAPAuthenticationProvider';
import { AuthController } from '../controllers/AuthController';

export function createAuthRouter(
  userRepository: IUserRepository,
  tokenService: ITokenService,
  passwordHasher: IPasswordHasher,
  pool?: Pool
): Router {
  const router = Router();

  // Configurar authentication providers (orden = prioridad)
  const authProviders: IAuthenticationProvider[] = [];

  // 1. LDAP Provider (si está habilitado)
  if (AUTH_CONFIG.enableLDAP && LDAP_CONFIG.length > 0) {
    const ldapProvider = new LDAPAuthenticationProvider(LDAP_CONFIG, 'LDAP');
    authProviders.push(ldapProvider);
    logInfo(`[Auth] LDAP authentication enabled with ${LDAP_CONFIG.length} server(s)`);
  }

  // 2. Database Provider (fallback)
  const dbProvider = new DatabaseAuthenticationProvider(userRepository, passwordHasher);
  authProviders.push(dbProvider);
  logInfo('[Auth] Database authentication enabled');

  // Create ApplicationRepository (for LDAP sync per-application configuration)
  let applicationRepository: IApplicationRepository | null = null;
  if (pool) {
    applicationRepository = new PostgresApplicationRepository(pool);
    logInfo('[Auth] Using PostgreSQL application repository');
  } else {
    applicationRepository = new InMemoryApplicationRepository();
    logInfo('[Auth] Using in-memory application repository');
  }

  // Create AssignRoleUseCase if pool is available (for LDAP user sync)
  let assignRoleUseCase: AssignRoleUseCase | undefined;
  if (pool) {
    // Dummy invalidate cache function (could be improved with actual cache service)
    const invalidateCache = (userId: string) => {
      logInfo(`[Cache] Invalidated cache for user ${userId}`);
    };
    assignRoleUseCase = new AssignRoleUseCase(pool, invalidateCache);
    logInfo('[Auth] LDAP user sync enabled with role assignment');
  }

  // Crear instancias de los casos de uso
  const loginUseCase = new LoginUseCase(
    userRepository,
    applicationRepository,
    tokenService,
    authProviders,
    assignRoleUseCase
  );

  const refreshTokenUseCase = new RefreshTokenUseCase(
    userRepository,
    tokenService
  );

  const validateTokenUseCase = new ValidateTokenUseCase(
    tokenService
  );

  const registerUserUseCase = new RegisterUserUseCase(
    userRepository,
    passwordHasher
  );

  // Crear controller con los casos de uso
  const authController = new AuthController(
    loginUseCase,
    refreshTokenUseCase,
    validateTokenUseCase,
    registerUserUseCase
  );

  // Definir rutas
  router.post('/login', (req, res, next) => authController.login(req, res, next));
  router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
  router.post('/validate', (req, res, next) => authController.validate(req, res, next));
  router.post('/register', (req, res, next) => authController.register(req, res, next));
  router.post('/logout', (req, res, next) => authController.logout(req, res, next));

  return router;
}
