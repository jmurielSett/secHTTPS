import { Application } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/app';
import { CertificateStatus } from '../../src/types/certificate';
import { ErrorCode } from '../../src/types/errors';
import { ExpirationStatus } from '../../src/types/shared';

describe('Certificates API - /api/certif', () => {
  let app: Application;

  beforeEach(async () => {
    const context = await createApp();
    app = context.app;
  });

  // Helper para crear certificados de prueba
  const createTestCertificate = async (overrides: any = {}) => {
    const defaultCertificate = {
      fileName: 'test.crt',
      startDate: '2026-01-01',
      expirationDate: '2027-01-01',
      server: 'test-server',
      filePath: '/etc/ssl/test.crt',
      client: 'Test Client',
      configPath: '/etc/nginx/test',
      responsibleContacts: [{ email: 'test@test.com', language: 'es' }]
    };

    const response = await request(app)
      .post('/api/certif')
      .send({ ...defaultCertificate, ...overrides });
    
    return response.body;
  };

  describe('POST /api/certif', () => {
    it('debería crear un nuevo certificado con estado ACTIVE y retornar 201', async () => {
      const newCertificate = {
        fileName: 'example.com.crt',
        startDate: '2026-01-01',
        expirationDate: '2027-01-01',
        server: 'web-prod-01',
        filePath: '/etc/ssl/certs/example.com.crt',
        client: 'Empresa XYZ',
        configPath: '/etc/nginx/sites-available/example.com',
        responsibleContacts: [
          { email: 'admin@empresa.com', language: 'es', name: 'Admin' },
          { email: 'devops@empresa.com', language: 'en' }
        ]
      };

      const response = await request(app)
        .post('/api/certif')
        .send(newCertificate)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.fileName).toBe(newCertificate.fileName);
      expect(response.body.status).toBe(CertificateStatus.ACTIVE);
      expect(response.body.expirationStatus).toMatch(/NORMAL|WARNING|EXPIRED/);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('debería retornar 400 si faltan campos requeridos', async () => {
      const incompleteCertificate = {
        fileName: 'example.com.crt',
        // Falta startDate, expirationDate, etc.
      };

      const response = await request(app)
        .post('/api/certif')
        .send(incompleteCertificate)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.REQUIRED_FIELDS);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si expirationDate no es posterior a startDate', async () => {
      const invalidCertificate = {
        fileName: 'example.com.crt',
        startDate: '2027-01-01',
        expirationDate: '2026-01-01', // Anterior a startDate
        server: 'web-prod-01',
        filePath: '/etc/ssl/certs/example.com.crt',
        client: 'Empresa XYZ',
        configPath: '/etc/nginx/sites-available/example.com',
        responsibleContacts: [{ email: 'admin@empresa.com', language: 'es' }]
      };

      const response = await request(app)
        .post('/api/certif')
        .send(invalidCertificate)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_DATE_RANGE);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si responsibleContacts está vacío', async () => {
      const invalidCertificate = {
        fileName: 'example.com.crt',
        startDate: '2026-01-01',
        expirationDate: '2027-01-01',
        server: 'web-prod-01',
        filePath: '/etc/ssl/certs/example.com.crt',
        client: 'Empresa XYZ',
        configPath: '/etc/nginx/sites-available/example.com',
        responsibleContacts: []
      };

      const response = await request(app)
        .post('/api/certif')
        .send(invalidCertificate)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_EMAIL_LIST);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/certif', () => {
    it('debería listar todos los certificados y retornar 200', async () => {
      // Crear 3 certificados de prueba
      await createTestCertificate({ fileName: 'cert1.crt' });
      await createTestCertificate({ fileName: 'cert2.crt' });
      await createTestCertificate({ fileName: 'cert3.crt' });

      const response = await request(app)
        .get('/api/certif')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('certificates');
      expect(Array.isArray(response.body.certificates)).toBe(true);
      expect(typeof response.body.total).toBe('number');
      expect(response.body.total).toBeGreaterThanOrEqual(3);
      expect(response.body.certificates.length).toBeGreaterThanOrEqual(3);
    });

    it('debería filtrar por cliente y excluir otros', async () => {
      // Crear certificados con diferentes clientes
      await createTestCertificate({ client: 'Empresa XYZ', fileName: 'xyz1.crt' });
      await createTestCertificate({ client: 'Empresa XYZ', fileName: 'xyz2.crt' });
      await createTestCertificate({ client: 'Empresa ABC', fileName: 'abc1.crt' });

      const response = await request(app)
        .get('/api/certif?client=Empresa XYZ')
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.certificates).toHaveLength(2);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.client).toBe('Empresa XYZ');
      });
    });

    it('debería filtrar por servidor y excluir otros', async () => {
      // Crear certificados con diferentes servidores
      await createTestCertificate({ server: 'web-prod-01', fileName: 'prod1.crt' });
      await createTestCertificate({ server: 'web-prod-01', fileName: 'prod2.crt' });
      await createTestCertificate({ server: 'web-dev-01', fileName: 'dev1.crt' });
      await createTestCertificate({ server: 'web-dev-01', fileName: 'dev2.crt' });

      const response = await request(app)
        .get('/api/certif?server=web-prod-01')
        .expect(200);

      expect(response.body.total).toBe(2);
      expect(response.body.certificates).toHaveLength(2);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.server).toBe('web-prod-01');
      });
    });

    it('debería filtrar por fileName exacto', async () => {
      // Crear certificados con nombres únicos
      await createTestCertificate({ fileName: 'unique-cert.crt' });
      await createTestCertificate({ fileName: 'other-cert.crt' });
      await createTestCertificate({ fileName: 'another-cert.crt' });

      const response = await request(app)
        .get('/api/certif?fileName=unique-cert.crt')
        .expect(200);

      expect(response.body.total).toBe(1);
      expect(response.body.certificates).toHaveLength(1);
      expect(response.body.certificates[0].fileName).toBe('unique-cert.crt');
    });

    it('debería filtrar por status ACTIVE y excluir DELETED', async () => {
      // Crear certificados ACTIVE
      await createTestCertificate({ fileName: 'active1.crt' });
      await createTestCertificate({ fileName: 'active2.crt' });
      const cert3 = await createTestCertificate({ fileName: 'todelete.crt' });

      // Eliminar uno (cambiar a DELETED)
      await request(app)
        .patch(`/api/certif/${cert3.id}/status`)
        .send({ status: CertificateStatus.DELETED });

      const response = await request(app)
        .get('/api/certif?status=ACTIVE')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(2);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.status).toBe(CertificateStatus.ACTIVE);
      });
    });

    it('debería filtrar por status DELETED', async () => {
      // Crear y eliminar certificados
      const cert1 = await createTestCertificate({ fileName: 'deleted1.crt' });
      const cert2 = await createTestCertificate({ fileName: 'deleted2.crt' });

      await request(app)
        .patch(`/api/certif/${cert1.id}/status`)
        .send({ status: CertificateStatus.DELETED });
      
      await request(app)
        .patch(`/api/certif/${cert2.id}/status`)
        .send({ status: CertificateStatus.DELETED });

      const response = await request(app)
        .get('/api/certif?status=DELETED')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(2);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.status).toBe(CertificateStatus.DELETED);
      });
    });

    it('debería filtrar por expirationStatus WARNING', async () => {
      // Certificado que expira en 5 días (WARNING)
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 5);
      
      await createTestCertificate({
        fileName: 'warning-cert.crt',
        expirationDate: warningDate.toISOString().split('T')[0]
      });

      // Certificado que expira en 30 días (NORMAL)
      const normalDate = new Date();
      normalDate.setDate(normalDate.getDate() + 30);
      
      await createTestCertificate({
        fileName: 'normal-cert.crt',
        expirationDate: normalDate.toISOString().split('T')[0]
      });

      const response = await request(app)
        .get('/api/certif?expirationStatus=WARNING')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(1);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.expirationStatus).toBe(ExpirationStatus.WARNING);
      });
    });

    it('debería filtrar por expirationStatus EXPIRED', async () => {
      // Certificado ya expirado
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 10);
      
      await createTestCertificate({
        fileName: 'expired-cert.crt',
        startDate: '2025-01-01',
        expirationDate: expiredDate.toISOString().split('T')[0]
      });

      const response = await request(app)
        .get('/api/certif?expirationStatus=EXPIRED')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(1);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.expirationStatus).toBe(ExpirationStatus.EXPIRED);
      });
    });

    it('debería combinar múltiples filtros correctamente', async () => {
      // Crear certificados con combinaciones específicas
      await createTestCertificate({
        client: 'Empresa XYZ',
        server: 'web-prod-01',
        fileName: 'xyz-prod-normal.crt',
        expirationDate: '2027-01-01' // NORMAL
      });

      await createTestCertificate({
        client: 'Empresa XYZ',
        server: 'web-dev-01', // Diferente servidor
        fileName: 'xyz-dev.crt',
        expirationDate: '2027-01-01'
      });

      await createTestCertificate({
        client: 'Empresa ABC', // Diferente cliente
        server: 'web-prod-01',
        fileName: 'abc-prod.crt',
        expirationDate: '2027-01-01'
      });

      const response = await request(app)
        .get('/api/certif?client=Empresa XYZ&server=web-prod-01&status=ACTIVE&expirationStatus=NORMAL')
        .expect(200);

      expect(response.body.total).toBeGreaterThanOrEqual(1);
      response.body.certificates.forEach((cert: any) => {
        expect(cert.client).toBe('Empresa XYZ');
        expect(cert.server).toBe('web-prod-01');
        expect(cert.status).toBe(CertificateStatus.ACTIVE);
        expect(cert.expirationStatus).toBe(ExpirationStatus.NORMAL);
      });
    });

    it('debería retornar lista vacía si no hay coincidencias', async () => {
      const response = await request(app)
        .get('/api/certif?client=Cliente Inexistente XYZ 999')
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.certificates).toEqual([]);
    });
  });

  describe('GET /api/certif/:id', () => {
    it('debería obtener un certificado por ID y retornar 200', async () => {
      // Crear un certificado primero
      const cert = await createTestCertificate({ fileName: 'cert-by-id.crt' });
      
      const response = await request(app)
        .get(`/api/certif/${cert.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', cert.id);
      expect(response.body).toHaveProperty('fileName');
      expect(response.body).toHaveProperty('startDate');
      expect(response.body).toHaveProperty('expirationDate');
      expect(response.body).toHaveProperty('server');
      expect(response.body).toHaveProperty('filePath');
      expect(response.body).toHaveProperty('client');
      expect(response.body).toHaveProperty('configPath');
      expect(response.body).toHaveProperty('responsibleContacts');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('expirationStatus');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('debería retornar 404 si el certificado no existe', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';
      
      const response = await request(app)
        .get(`/api/certif/${nonExistentId}`)
        .expect(404);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_NOT_FOUND);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('no encontrado');
    });

    it('debería retornar 400 si el ID no es un UUID válido', async () => {
      const invalidId = 'invalid-uuid';
      
      const response = await request(app)
        .get(`/api/certif/${invalidId}`)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_UUID);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PUT /api/certif/:id', () => {
    it('debería actualizar un certificado existente y retornar 200', async () => {
      // Crear un certificado primero
      const cert = await createTestCertificate({ fileName: 'original.crt' });
      
      const updateData = {
        fileName: 'nuevo-nombre.crt',
        expirationDate: '2027-06-01',
        responsibleContacts: [{ email: 'nuevo@empresa.com', language: 'es' }]
      };

      const response = await request(app)
        .put(`/api/certif/${cert.id}`)
        .send(updateData)
        .expect(200);

      expect(response.body.id).toBe(cert.id);
      expect(response.body.fileName).toBe(updateData.fileName);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('debería retornar 404 si el certificado no existe', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';
      const updateData = {
        fileName: 'nuevo-nombre.crt'
      };

      const response = await request(app)
        .put(`/api/certif/${nonExistentId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_NOT_FOUND);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si se intenta modificar un certificado eliminado', async () => {
      // Crear y eliminar un certificado
      const cert = await createTestCertificate({ fileName: 'to-delete.crt' });
      await request(app)
        .patch(`/api/certif/${cert.id}/status`)
        .send({ status: CertificateStatus.DELETED });
      
      const updateData = {
        fileName: 'nuevo-nombre.crt'
      };

      const response = await request(app)
        .put(`/api/certif/${cert.id}`)
        .send(updateData)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_ALREADY_DELETED);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminado');
    });

    it('debería retornar 400 si la nueva expirationDate es anterior a startDate', async () => {
      // Crear un certificado primero
      const cert = await createTestCertificate({ fileName: 'test-dates.crt' });
      
      const invalidUpdate = {
        startDate: '2027-01-01',
        expirationDate: '2026-01-01'
      };

      const response = await request(app)
        .put(`/api/certif/${cert.id}`)
        .send(invalidUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_DATE_RANGE);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('PATCH /api/certif/:id/status', () => {
    it('debería cambiar el estado a DELETED y retornar 200', async () => {
      // Crear un certificado primero
      const cert = await createTestCertificate({ fileName: 'to-delete.crt' });
      const statusUpdate = {
        status: CertificateStatus.DELETED
      };

      const response = await request(app)
        .patch(`/api/certif/${cert.id}/status`)
        .send(statusUpdate)
        .expect(200);

      expect(response.body.id).toBe(cert.id);
      expect(response.body.status).toBe(CertificateStatus.DELETED);
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('debería retornar 404 si el certificado no existe', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';
      const statusUpdate = {
        status: CertificateStatus.DELETED
      };

      const response = await request(app)
        .patch(`/api/certif/${nonExistentId}/status`)
        .send(statusUpdate)
        .expect(404);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_NOT_FOUND);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar 400 si el certificado ya está eliminado', async () => {
      // Crear y eliminar un certificado
      const cert = await createTestCertificate({ fileName: 'already-deleted.crt' });
      
      // Eliminarlo primero
      await request(app)
        .patch(`/api/certif/${cert.id}/status`)
        .send({ status: CertificateStatus.DELETED });
      
      // Intentar eliminarlo de nuevo
      const statusUpdate = {
        status: CertificateStatus.DELETED
      };

      const response = await request(app)
        .patch(`/api/certif/${cert.id}/status`)
        .send(statusUpdate)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_ALREADY_DELETED);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('eliminado');
    });

    it('debería retornar 400 si el status no es DELETED', async () => {
      // Crear un certificado para este test
      const cert = await createTestCertificate({ fileName: 'invalid-status-test.crt' });
      const invalidStatus = {
        status: CertificateStatus.ACTIVE
      };

      const response = await request(app)
        .patch(`/api/certif/${cert.id}/status`)
        .send(invalidStatus)
        .expect(400);

      expect(response.body).toHaveProperty('code', ErrorCode.INVALID_STATUS);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('GET /api/certif/:id/notifications', () => {
    it('debería obtener las notificaciones de un certificado y retornar 200', async () => {
      // Crear un certificado primero
      const cert = await createTestCertificate({ fileName: 'cert-with-notifications.crt' });

      const response = await request(app)
        .get(`/api/certif/${cert.id}/notifications`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('notifications');
      expect(Array.isArray(response.body.notifications)).toBe(true);
      expect(typeof response.body.total).toBe('number');
    });

    it('debería retornar 404 si el certificado no existe', async () => {
      const nonExistentId = '999e9999-e99b-99d9-a999-999999999999';

      const response = await request(app)
        .get(`/api/certif/${nonExistentId}/notifications`)
        .expect(404);

      expect(response.body).toHaveProperty('code', ErrorCode.CERTIFICATE_NOT_FOUND);
      expect(response.body).toHaveProperty('message');
    });

    it('debería retornar un array vacío si el certificado no tiene notificaciones', async () => {
      // Crear un certificado sin notificaciones
      const cert = await createTestCertificate({ fileName: 'cert-without-notifications.crt' });

      const response = await request(app)
        .get(`/api/certif/${cert.id}/notifications`)
        .expect(200);

      expect(response.body.total).toBe(0);
      expect(response.body.notifications).toEqual([]);
    });
  });
});
