import { NextFunction, Request, Response } from 'express';
import { TokenPayload } from '../../types/user';
import { JWTService } from '../security/JWTService';

// Extend Express Request to carry the authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// Lazy singleton — se crea solo la primera vez que se usa,
// evitando fallos en tests que no establecen JWT secrets en el entorno.
let _jwtService: JWTService | null = null;
function getJwtService(): JWTService {
  if (!_jwtService) {
    _jwtService = new JWTService();
  }
  return _jwtService;
}

/**
 * Middleware: verifica que la petición lleva un access token válido.
 * El token se extrae de la cookie httpOnly `accessToken` o del header
 * `Authorization: Bearer <token>` como fallback.
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // 1. Cookie httpOnly (principal)
  let token: string | undefined = req.cookies?.accessToken;

  // 2. Fallback: Authorization header
  if (!token) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({
      error: {
        code: 'MISSING_TOKEN',
        message: 'Authentication required'
      }
    });
    return;
  }

  try {
    const payload = getJwtService().verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired access token'
      }
    });
  }
}

/**
 * Middleware factory: comprueba que el usuario autenticado tiene el rol requerido.
 * Soporta tanto tokens de app única (`roles[]`) como tokens multi-app (`applications[]`).
 * Debe usarse siempre después de `authenticateToken`.
 *
 * @param role - Nombre del rol requerido (ej: 'admin')
 * @param applicationName - Nombre de la app para tokens multi-app (opcional)
 */
export function requireRole(role: string, applicationName?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required'
        }
      });
      return;
    }

    let hasRole = false;

    // Token de app única
    if (user.roles) {
      hasRole = user.roles.includes(role);
    }

    // Token multi-app
    if (!hasRole && user.applications) {
      const targetApp = applicationName ?? user.applicationName;
      if (targetApp) {
        const appEntry = user.applications.find(a => a.applicationName === targetApp);
        hasRole = appEntry?.roles.includes(role) ?? false;
      } else {
        // Sin app concreta: basta con que *cualquier* app tenga el rol
        hasRole = user.applications.some(a => a.roles.includes(role));
      }
    }

    if (!hasRole) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `Role '${role}' required`
        }
      });
      return;
    }

    next();
  };
}
