import { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

/** Extrae el valor de una cookie httpOnly del array Set-Cookie del response */
function extractCookie(cookies: string[] | undefined, name: string): string | undefined {
  if (!cookies) return undefined;
  for (const cookie of cookies) {
    const match = new RegExp(`^${name}=([^;]+)`).exec(cookie);
    if (match) return decodeURIComponent(match[1]);
  }
  return undefined;
}

describe('Auth API - /auth', () => {
  let app: Application;

  beforeEach(async () => {
    const context = await createApp();
    app = context.app;
  });

  describe('POST /auth/login', () => {
    it('debería autenticar usuario válido y retornar tokens con 200', async () => {
      const credentials = {
        username: 'admin',
        password: 'Admin123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(200);

      // Los tokens se envían como cookies httpOnly, no en el body
      const cookies = response.headers['set-cookie'] as string[] | undefined;
      expect(extractCookie(cookies, 'accessToken')).toBeTruthy();
      expect(extractCookie(cookies, 'refreshToken')).toBeTruthy();

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('debería rechazar credenciales inválidas con 401', async () => {
      const credentials = {
        username: 'admin',
        password: 'WrongPassword123' // Contraseña válida pero incorrecta
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('debería rechazar usuario inexistente con 401 o 503 si LDAP no está disponible', async () => {
      const credentials = {
        username: 'nonexistent',
        password: 'SomePassword123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials);

      // 401 si LDAP está disponible y confirma que el usuario no existe
      // 503 si LDAP no está disponible (no se puede saber si el usuario existe en LDAP)
      expect([401, 503]).toContain(response.status);
      expect(response.body).toHaveProperty('error');
    });

    it('debería validar formato de username con 400', async () => {
      const credentials = {
        username: 'ab', // Menos de 3 caracteres
        password: 'Admin123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debería validar formato de password con 400', async () => {
      const credentials = {
        username: 'admin',
        password: 'short' // No cumple requisitos de fortaleza
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar body sin username con 400', async () => {
      const credentials = {
        password: 'Admin123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar body sin password con 400', async () => {
      const credentials = {
        username: 'admin'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    let validRefreshToken: string;

    beforeEach(async () => {
      // Obtener refresh token válido mediante login (viene en cookie httpOnly)
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const cookies = response.headers['set-cookie'] as string[] | undefined;
      validRefreshToken = extractCookie(cookies, 'refreshToken') ?? '';
    });

    it('debería generar nuevos tokens con refresh token válido y retornar 200', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      // Los tokens nuevos vienen en cookies httpOnly
      const cookies = response.headers['set-cookie'] as string[] | undefined;
      expect(extractCookie(cookies, 'accessToken')).toBeTruthy();
      expect(extractCookie(cookies, 'refreshToken')).toBeTruthy();

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('debería rechazar refresh token inválido con 401', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('debería rechazar refresh token expirado con 401', async () => {
      // Token expirado generado con fecha pasada (mock o JWT con exp en el pasado)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTYwOTQ1OTIwMCwiZXhwIjoxNjA5NDU5MjAwfQ.invalid';

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('debería rechazar body sin refreshToken con 400', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar access token usado como refresh token con 401', async () => {
      // Obtener access token desde cookie httpOnly
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const loginCookies = loginResponse.headers['set-cookie'] as string[] | undefined;
      const accessToken = extractCookie(loginCookies, 'accessToken') ?? '';

      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /auth/validate', () => {
    let validAccessToken: string;

    beforeEach(async () => {
      // Obtener access token válido desde cookie httpOnly
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const cookies = response.headers['set-cookie'] as string[] | undefined;
      validAccessToken = extractCookie(cookies, 'accessToken') ?? '';
    });

    it('debería validar access token válido y retornar info del usuario con 200', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({ token: validAccessToken })
        .expect(200);

      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('debería rechazar token inválido con 401', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({ token: 'invalid.token.here' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('debería rechazar token expirado con 401', async () => {
      // Token expirado generado con fecha pasada
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NSIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNjA5NDU5MjAwLCJleHAiOjE2MDk0NTkyMDB9.invalid';

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: expiredToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('debería rechazar body sin token con 400', async () => {
      const response = await request(app)
        .post('/auth/validate')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('debería rechazar refresh token usado como access token con 401', async () => {
      // Obtener refresh token desde cookie httpOnly
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const loginCookies = loginResponse.headers['set-cookie'] as string[] | undefined;
      const refreshToken = extractCookie(loginCookies, 'refreshToken') ?? '';

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
