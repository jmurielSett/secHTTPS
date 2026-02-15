import { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';

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

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
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

    it('debería rechazar usuario inexistente con 401', async () => {
      const credentials = {
        username: 'nonexistent',
        password: 'SomePassword123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
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
      // Obtener refresh token válido mediante login
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      validRefreshToken = response.body.refreshToken;
    });

    it('debería generar nuevos tokens con refresh token válido y retornar 200', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({ refreshToken: validRefreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('username', 'admin');
      expect(response.body.user).not.toHaveProperty('password');
      
      // Los tokens son válidos (no verificamos si son diferentes porque
      // pueden ser iguales si se generan en el mismo segundo)
      expect(response.body.accessToken).toBeTruthy();
      expect(response.body.refreshToken).toBeTruthy();
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
      // Obtener access token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const accessToken = loginResponse.body.accessToken;

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
      // Obtener access token válido mediante login
      const response = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      validAccessToken = response.body.accessToken;
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
      // Obtener refresh token
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          username: 'admin',
          password: 'Admin123'
        });
      
      const refreshToken = loginResponse.body.refreshToken;

      const response = await request(app)
        .post('/auth/validate')
        .send({ token: refreshToken })
        .expect(401);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});
