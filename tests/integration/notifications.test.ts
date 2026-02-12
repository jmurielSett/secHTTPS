import { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { ErrorCode } from '../../src/types/errors';
import { NotificationResult } from '../../src/types/notification';
import { ExpirationStatus } from '../../src/types/shared';

describe('Notifications API', () => {
  let app: Application;

  beforeEach(() => {
    app = createApp();
  });

  // Helper para crear un certificado de prueba
  const createTestCertificate = async (overrides: any = {}) => {
    const defaultCertificate = {
      fileName: 'test.crt',
      startDate: '2026-01-01',
      expirationDate: '2027-01-01',
      server: 'test-server',
      filePath: '/etc/ssl/test.crt',
      client: 'Test Client',
      configPath: '/etc/nginx/test',
      responsibleEmails: ['test@test.com']
    };

    const response = await request(app)
      .post('/api/certif')
      .send({ ...defaultCertificate, ...overrides });
    
    return response.body;
  };

  describe('POST /api/notif', () => {
    it('debería registrar una notificación SENT exitosamente y retornar 201', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-1.crt' });
      
      const notificationData = {
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com', 'devops@empresa.com'],
        subject: 'Certificado cert-1.crt expirará en 5 días',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      };

      const response = await request(app)
        .post('/api/notif')
        .send(notificationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.certificateId).toBe(cert.id);
      expect(response.body.recipientEmails).toEqual(notificationData.recipientEmails);
      expect(response.body.subject).toBe(notificationData.subject);
      expect(response.body.expirationStatusAtTime).toBe(ExpirationStatus.WARNING);
      expect(response.body.result).toBe(NotificationResult.SENT);
      expect(response.body).toHaveProperty('sentAt');
      expect(response.body.errorMessage).toBeNull();
    });

    it('debería registrar una notificación ERROR con errorMessage y retornar 201', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-2.crt' });

      const notificationData = {
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Certificado cert-2.crt ha expirado',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.ERROR,
        errorMessage: 'SMTP connection timeout'
      };

      const response = await request(app)
        .post('/api/notif')
        .send(notificationData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.certificateId).toBe(cert.id);
      expect(response.body.result).toBe(NotificationResult.ERROR);
      expect(response.body.errorMessage).toBe('SMTP connection timeout');
    });

    it('debería retornar 400 si faltan campos requeridos', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-3.crt' });

      const incompleteNotification = {
        certificateId: cert.id
        // Faltan recipientEmails, subject, etc.
      };

      const response = await request(app)
        .post('/api/notif')
        .send(incompleteNotification)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.REQUIRED_FIELDS);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si el certificateId no es un UUID válido', async () => {
      const invalidNotification = {
        certificateId: 'invalid-uuid',
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      };

      const response = await request(app)
        .post('/api/notif')
        .send(invalidNotification)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_UUID);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 404 si el certificado no existe', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';

      const notificationData = {
        certificateId: nonExistentId,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      };

      const response = await request(app)
        .post('/api/notif')
        .send(notificationData)
        .expect(404);

      expect(response.body).toHaveProperty('code', 'CERTIFICATE_NOT_FOUND');
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si recipientEmails está vacío', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-4.crt' });

      const invalidNotification = {
        certificateId: cert.id,
        recipientEmails: [],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      };

      const response = await request(app)
        .post('/api/notif')
        .send(invalidNotification)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_EMAIL_LIST);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si result es ERROR pero no hay errorMessage', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-5.crt' });

      const invalidNotification = {
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.ERROR
        // Falta errorMessage
      };

      const response = await request(app)
        .post('/api/notif')
        .send(invalidNotification)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.ERROR_MESSAGE_REQUIRED);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/notif', () => {
    it('debería listar todas las notificaciones sin filtros y retornar 200', async () => {
      const cert1 = await createTestCertificate({ fileName: 'cert-get-1.crt' });
      const cert2 = await createTestCertificate({ fileName: 'cert-get-2.crt' });

      // Crear 3 notificaciones
      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test 1',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert2.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test 2',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.ERROR,
        errorMessage: 'Error test'
      });

      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test 3',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      const response = await request(app)
        .get('/api/notif')
        .expect(200);

      expect(response.body).toHaveProperty('total', 3);
      expect(response.body.notifications).toHaveLength(3);
    });

    it('debería filtrar por certificateId y retornar solo sus notificaciones', async () => {
      const cert1 = await createTestCertificate({ fileName: 'cert-filter-1.crt' });
      const cert2 = await createTestCertificate({ fileName: 'cert-filter-2.crt' });

      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert 1 - Notif 1',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert2.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert 2 - Notif 1',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert 1 - Notif 2',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      const response = await request(app)
        .get('/api/notif')
        .query({ certificateId: cert1.id })
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.notifications).toHaveLength(2);
      expect(response.body.notifications[0].certificateId).toBe(cert1.id);
      expect(response.body.notifications[1].certificateId).toBe(cert1.id);
    });

    it('debería filtrar por result SENT', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-result.crt' });

      await request(app).post('/api/notif').send({
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test SENT',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test ERROR',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.ERROR,
        errorMessage: 'Error'
      });

      const response = await request(app)
        .get('/api/notif')
        .query({ result: NotificationResult.SENT })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.notifications[0].result).toBe(NotificationResult.SENT);
    });

    it('debería filtrar por expirationStatus WARNING', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-expstatus.crt' });

      await request(app).post('/api/notif').send({
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test WARNING',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test EXPIRED',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.SENT
      });

      const response = await request(app)
        .get('/api/notif')
        .query({ expirationStatus: ExpirationStatus.WARNING })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.notifications[0].expirationStatusAtTime).toBe(ExpirationStatus.WARNING);
    });

    it('debería combinar múltiples filtros correctamente', async () => {
      const cert1 = await createTestCertificate({ fileName: 'cert-multi-1.crt' });
      const cert2 = await createTestCertificate({ fileName: 'cert-multi-2.crt' });

      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert1 WARNING SENT',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert1.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert1 EXPIRED SENT',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.SENT
      });

      await request(app).post('/api/notif').send({
        certificateId: cert2.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Cert2 WARNING SENT',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      const response = await request(app)
        .get('/api/notif')
        .query({ 
          certificateId: cert1.id,
          expirationStatus: ExpirationStatus.WARNING
        })
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.notifications[0].certificateId).toBe(cert1.id);
      expect(response.body.notifications[0].expirationStatusAtTime).toBe(ExpirationStatus.WARNING);
    });

    it('debería retornar lista vacía si no hay coincidencias con los filtros', async () => {
      const cert = await createTestCertificate({ fileName: 'cert-empty.crt' });

      await request(app).post('/api/notif').send({
        certificateId: cert.id,
        recipientEmails: ['admin@empresa.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT
      });

      const response = await request(app)
        .get('/api/notif')
        .query({ result: NotificationResult.ERROR })
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.notifications).toEqual([]);
    });
  });
});
