import { NextFunction, Request, Response } from 'express';
import {
  LoginUseCase,
  RefreshTokenUseCase,
  RegisterUserUseCase,
  ValidateTokenUseCase
} from '../../../domain/usecases';
import { Password, Token, Username } from '../../../domain/value-objects';

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly validateTokenUseCase: ValidateTokenUseCase,
    private readonly registerUserUseCase: RegisterUserUseCase
  ) {}

  /**
   * POST /auth/login
   * Autentica un usuario y retorna tokens de acceso
   * - Si se proporciona applicationName: token específico con roles de esa app (recomendado)
   * - Si no se proporciona: token con roles de todas las apps (menos seguro, mayor tamaño)
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, password, applicationName } = req.body;

      // Validar que los campos obligatorios están presentes
      if (!username || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username and password are required'
          }
        });
        return;
      }

      // Validar formato con Value Objects
      let usernameVO: Username;
      let passwordVO: Password;
      
      try {
        usernameVO = Username.create(username);
        passwordVO = Password.create(password);
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Invalid input'
          }
        });
        return;
      }

      // Ejecutar caso de uso
      const result = await this.loginUseCase.execute({
        username: usernameVO.getValue(),
        password: passwordVO.getValue(),
        applicationName // Optional: single-app token if provided
      });

      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Renueva los tokens usando un refresh token válido
   */
  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      // Validar que el refreshToken está presente
      if (!refreshToken) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token is required'
          }
        });
        return;
      }

      // Validar formato con Value Object
      let tokenVO: Token;
      
      try {
        tokenVO = Token.create(refreshToken);
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Invalid token format'
          }
        });
        return;
      }

      // Ejecutar caso de uso
      const result = await this.refreshTokenUseCase.execute({
        refreshToken: tokenVO.getValue()
      });

      res.status(200).json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/validate
   * Valida un access token y retorna información del payload
   * 
   * IMPORTANTE: Solo valida firma y expiración del token (stateless).
   * NO verifica permisos actuales contra base de datos.
   * Para verificar permisos en tiempo real, usar middleware de autorización.
   */
  async validate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token } = req.body;

      // Validar que el token está presente
      if (!token) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Token is required'
          }
        });
        return;
      }

      // Validar formato con Value Object
      let tokenVO: Token;
      
      try {
        tokenVO = Token.create(token);
      } catch (error) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof Error ? error.message : 'Invalid token format'
          }
        });
        return;
      }

      // Ejecutar caso de uso
      const result = this.validateTokenUseCase.execute(tokenVO.getValue());

      res.status(200).json({
        valid: true,
        user: {
          id: result.userId,
          username: result.username,
          role: result.roles && result.roles.length > 0 ? result.roles[0] : 'user',
          applicationName: result.applicationName,
          applications: result.applications
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/register
   * Registra un nuevo usuario (público)
   * El usuario se crea sin roles asignados (admin debe asignarlos después)
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { username, email, password } = req.body;

      // Validar que los campos obligatorios están presentes
      if (!username || !email || !password) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username, email, and password are required'
          }
        });
        return;
      }

      // Ejecutar caso de uso de registro
      const user = await this.registerUserUseCase.execute({
        username,
        email,
        password
      });

      res.status(201).json({
        message: 'User registered successfully',
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
}
