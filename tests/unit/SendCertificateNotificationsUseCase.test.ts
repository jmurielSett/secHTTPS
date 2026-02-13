import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IEmailService } from '../../src/domain/services/IEmailService';
import { SendCertificateNotificationsUseCase } from '../../src/domain/usecases/notifications/SendCertificateNotificationsUseCase';
import { ICertificateRepository } from '../../src/infrastructure/persistence/CertificateRepository';
import { INotificationRepository } from '../../src/infrastructure/persistence/NotificationRepository';
import { Certificate, CertificateStatus } from '../../src/types/certificate';
import { Notification, NotificationResult } from '../../src/types/notification';
import { ExpirationStatus } from '../../src/types/shared';

/**
 * Tests para el UseCase de envío de notificaciones
 * Verifica la lógica de negocio:
 * - Filtrado de certificados WARNING/EXPIRED activos
 * - Frecuencia de notificaciones (WARNING: 48h, EXPIRED: 24h)
 * - Envío de emails y registro de notificaciones
 */
describe('SendCertificateNotificationsUseCase', () => {
  let useCase: SendCertificateNotificationsUseCase;
  let mockCertificateRepo: ICertificateRepository;
  let mockNotificationRepo: INotificationRepository;
  let mockEmailService: IEmailService;

  // Mock certificates
  const warningCert: Certificate = {
    id: 'cert-1',
    fileName: 'warning.crt',
    startDate: '2026-01-01',
    expirationDate: '2026-02-18', // 5 días
    server: 'web-prod-01',
    filePath: '/etc/ssl/warning.crt',
    client: 'Empresa Test',
    configPath: '/etc/nginx/sites/test.conf',
    responsibleEmails: ['admin@test.com'],
    status: CertificateStatus.ACTIVE,
    expirationStatus: ExpirationStatus.WARNING,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-13T00:00:00Z'
  };

  const expiredCert: Certificate = {
    id: 'cert-2',
    fileName: 'expired.crt',
    startDate: '2025-01-01',
    expirationDate: '2026-02-01', // Expirado hace 12 días
    server: 'web-prod-02',
    filePath: '/etc/ssl/expired.crt',
    client: 'Empresa Test',
    configPath: '/etc/nginx/sites/test2.conf',
    responsibleEmails: ['admin@test.com'],
    status: CertificateStatus.ACTIVE,
    expirationStatus: ExpirationStatus.EXPIRED,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2026-02-13T00:00:00Z'
  };

  beforeEach(() => {
    // Mock repositories
    mockCertificateRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    };

    mockNotificationRepo = {
      findAll: vi.fn(),
      findByCertificateId: vi.fn(),
      findLastByCertificateId: vi.fn(),
      save: vi.fn()
    };

    // Mock email service
    mockEmailService = {
      sendExpirationAlert: vi.fn(),
      sendCertificateCreationNotification: vi.fn(),
      verifyConnection: vi.fn()
    };

    // Create use case instance
    useCase = new SendCertificateNotificationsUseCase(
      mockCertificateRepo,
      mockNotificationRepo,
      mockEmailService
    );
  });

  describe('execute', () => {
    it('debería enviar notificaciones para certificados sin notificaciones previas', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.WARNING) {
          return [warningCert];
        }
        if (filters?.expirationStatus === ExpirationStatus.EXPIRED) {
          return [expiredCert];
        }
        return [];
      });

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(null);
      vi.mocked(mockEmailService.sendExpirationAlert).mockResolvedValue();
      vi.mocked(mockNotificationRepo.save).mockImplementation(async (notif) => notif);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesChecked).toBe(2);
      expect(result.totalCertificatesNeedingNotification).toBe(2);
      expect(result.totalNotificationsSent).toBe(2);
      expect(result.totalNotificationsFailed).toBe(0);

      // Verificar que se llamó findAll dos veces (WARNING y EXPIRED)
      expect(mockCertificateRepo.findAll).toHaveBeenCalledTimes(2);
      
      // Verificar que se enviaron dos emails
      expect(mockEmailService.sendExpirationAlert).toHaveBeenCalledTimes(2);
      
      // Verificar que se guardaron dos notificaciones
      expect(mockNotificationRepo.save).toHaveBeenCalledTimes(2);
    });

    it('debería NO enviar notificación si la última fue hace menos de 48h (WARNING)', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.WARNING) {
          return [warningCert];
        }
        return [];
      });

      // Última notificación hace 24 horas (< 48h)
      const recentNotification: Notification = {
        id: 'notif-1',
        certificateId: warningCert.id,
        sentAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        recipientEmails: ['admin@test.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT,
        errorMessage: null
      };

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(recentNotification);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesChecked).toBe(1);
      expect(result.totalCertificatesNeedingNotification).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(mockEmailService.sendExpirationAlert).not.toHaveBeenCalled();
    });

    it('debería enviar notificación si la última fue hace más de 48h (WARNING)', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.WARNING) {
          return [warningCert];
        }
        return [];
      });

      // Última notificación hace 50 horas (> 48h)
      const oldNotification: Notification = {
        id: 'notif-1',
        certificateId: warningCert.id,
        sentAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
        recipientEmails: ['admin@test.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.WARNING,
        result: NotificationResult.SENT,
        errorMessage: null
      };

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(oldNotification);
      vi.mocked(mockEmailService.sendExpirationAlert).mockResolvedValue();
      vi.mocked(mockNotificationRepo.save).mockImplementation(async (notif) => notif);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesNeedingNotification).toBe(1);
      expect(result.totalNotificationsSent).toBe(1);
      expect(mockEmailService.sendExpirationAlert).toHaveBeenCalledWith(warningCert);
    });

    it('debería NO enviar notificación si la última fue hace menos de 24h (EXPIRED)', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.EXPIRED) {
          return [expiredCert];
        }
        return [];
      });

      // Última notificación hace 12 horas (< 24h)
      const recentNotification: Notification = {
        id: 'notif-1',
        certificateId: expiredCert.id,
        sentAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        recipientEmails: ['admin@test.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.SENT,
        errorMessage: null
      };

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(recentNotification);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesNeedingNotification).toBe(0);
      expect(mockEmailService.sendExpirationAlert).not.toHaveBeenCalled();
    });

    it('debería enviar notificación si la última fue hace más de 24h (EXPIRED)', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.EXPIRED) {
          return [expiredCert];
        }
        return [];
      });

      // Última notificación hace 25 horas (> 24h)
      const oldNotification: Notification = {
        id: 'notif-1',
        certificateId: expiredCert.id,
        sentAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
        recipientEmails: ['admin@test.com'],
        subject: 'Test',
        expirationStatusAtTime: ExpirationStatus.EXPIRED,
        result: NotificationResult.SENT,
        errorMessage: null
      };

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(oldNotification);
      vi.mocked(mockEmailService.sendExpirationAlert).mockResolvedValue();
      vi.mocked(mockNotificationRepo.save).mockImplementation(async (notif) => notif);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesNeedingNotification).toBe(1);
      expect(result.totalNotificationsSent).toBe(1);
    });

    it('debería registrar notificación ERROR si falla el envío del email', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockImplementation(async (filters: any) => {
        if (filters?.expirationStatus === ExpirationStatus.WARNING) {
          return [warningCert];
        }
        return [];
      });

      vi.mocked(mockNotificationRepo.findLastByCertificateId).mockResolvedValue(null);
      vi.mocked(mockEmailService.sendExpirationAlert).mockRejectedValue(
        new Error('SMTP connection failed')
      );
      vi.mocked(mockNotificationRepo.save).mockImplementation(async (notif) => notif);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalNotificationsSent).toBe(0);
      expect(result.totalNotificationsFailed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('SMTP connection failed');

      // Verificar que se guardó notificación con ERROR
      expect(mockNotificationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          result: NotificationResult.ERROR,
          errorMessage: 'SMTP connection failed'
        })
      );
    });

    it('debería NO procesar certificados DELETED', async () => {
      // Arrange
      // findAll se llama con filtro status = ACTIVE, así que no debería retornar deleted
      vi.mocked(mockCertificateRepo.findAll).mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesChecked).toBe(0);
      expect(mockEmailService.sendExpirationAlert).not.toHaveBeenCalled();
    });

    it('debería retornar 0 certificados si no hay WARNING ni EXPIRED', async () => {
      // Arrange
      vi.mocked(mockCertificateRepo.findAll).mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.totalCertificatesChecked).toBe(0);
      expect(result.totalCertificatesNeedingNotification).toBe(0);
      expect(result.totalNotificationsSent).toBe(0);
      expect(mockEmailService.sendExpirationAlert).not.toHaveBeenCalled();
    });
  });
});
