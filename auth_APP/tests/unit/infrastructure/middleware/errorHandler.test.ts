import { DomainError } from '@/domain/errors/DomainError';
import {
    AuthenticationError,
    InvalidTokenError,
    errorHandler
} from '@/infrastructure/middleware/errorHandler';
import express, { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

/**
 * Creates a minimal Express app that throws the given error and delegates to errorHandler
 */
function appWithError(err: Error) {
  const app = express();
  // Route that simply throws
  app.get('/test', (_req: Request, _res: Response, next: NextFunction) => {
    next(err);
  });
  // Attach error handler (Express recognises 4-arg middleware as error handler)
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {

  describe('DomainError mapping', () => {
    it.each([
      ['DUPLICATE_USERNAME', 409],
      ['DUPLICATE_EMAIL', 409],
      ['USER_NOT_FOUND', 404],
      ['ROLE_NOT_FOUND', 404],
      ['APPLICATION_NOT_FOUND', 404],
      ['INVALID_CREDENTIALS', 401],
      ['UNAUTHORIZED', 401],
      ['FORBIDDEN', 403],
      ['UNKNOWN_CODE', 400],   // unmapped codes fall back to 400
    ] as const)('should map DomainError(%s) → HTTP %i', async (code, expectedStatus) => {
      const app = appWithError(new DomainError('some message', code));
      const res = await request(app).get('/test');
      expect(res.status).toBe(expectedStatus);
      expect(res.body.error.code).toBe(code);
    });

    it('should include the error message in the response body', async () => {
      const app = appWithError(new DomainError('Username already taken', 'DUPLICATE_USERNAME'));
      const res = await request(app).get('/test');
      expect(res.body.error.message).toBe('Username already taken');
    });
  });

  describe('AuthenticationError', () => {
    it('should return 401 for AuthenticationError', async () => {
      const app = appWithError(new AuthenticationError());
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 401 for generic "Invalid credentials" message', async () => {
      const err = new Error('Invalid credentials');
      const app = appWithError(err);
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
    });
  });

  describe('InvalidTokenError', () => {
    it('should return 401 for InvalidTokenError', async () => {
      const app = appWithError(new InvalidTokenError());
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should return 401 for errors with "jwt" in the message', async () => {
      const app = appWithError(new Error('jwt expired'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
    });

    it('should return 401 for errors with "token" in the message', async () => {
      const app = appWithError(new Error('Invalid token provided'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(401);
    });
  });

  describe('User not found', () => {
    it('should return 404 for "User not found" message', async () => {
      const app = appWithError(new Error('User not found'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('Generic errors', () => {
    it('should return 500 for unhandled errors', async () => {
      const app = appWithError(new Error('Something went very wrong'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should not leak internal error messages for 500 errors', async () => {
      const app = appWithError(new Error('DB connection failed: password auth failed'));
      const res = await request(app).get('/test');
      expect(res.status).toBe(500);
      expect(res.body.error.message).toBe('An unexpected error occurred');
    });
  });

  describe('Exported error classes', () => {
    it('AuthenticationError should have correct name', () => {
      const err = new AuthenticationError('auth failed');
      expect(err.name).toBe('AuthenticationError');
      expect(err.message).toBe('auth failed');
    });

    it('InvalidTokenError should have correct name', () => {
      const err = new InvalidTokenError('bad token');
      expect(err.name).toBe('InvalidTokenError');
      expect(err.message).toBe('bad token');
    });

    it('AuthenticationError should use default message', () => {
      const err = new AuthenticationError();
      expect(err.message).toBe('Authentication failed');
    });

    it('InvalidTokenError should use default message', () => {
      const err = new InvalidTokenError();
      expect(err.message).toBe('Invalid or expired token');
    });
  });
});
