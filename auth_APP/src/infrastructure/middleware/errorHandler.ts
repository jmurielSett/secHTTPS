import { NextFunction, Request, Response } from 'express';
import { DomainError } from '../../domain/errors/DomainError';
import { logError } from '../../utils/logger';

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid or expired token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logError('Error:', err);

  // Mapear errores específicos a códigos de estado HTTP

  // DomainError: errores de negocio con código tipado
  if (err instanceof DomainError) {
    const domainStatusMap: Record<string, number> = {
      DUPLICATE_USERNAME: 409,
      DUPLICATE_EMAIL: 409,
      USER_NOT_FOUND: 404,
      ROLE_NOT_FOUND: 404,
      APPLICATION_NOT_FOUND: 404,
      INVALID_CREDENTIALS: 401,
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
    };
    const status = domainStatusMap[err.code] ?? 400;
    res.status(status).json({
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  if (err.name === 'AuthenticationError' || err.message === 'Invalid credentials') {
    res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: err.message || 'Invalid credentials'
      }
    });
    return;
  }

  if (err.name === 'InvalidTokenError' || err.message.includes('Invalid token') || err.message.includes('jwt') || err.message.includes('token')) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: err.message || 'Invalid or expired token'
      }
    });
    return;
  }

  if (err.message.includes('User not found')) {
    res.status(404).json({
      error: {
        code: 'USER_NOT_FOUND',
        message: err.message
      }
    });
    return;
  }

  // Error genérico del servidor
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
}
