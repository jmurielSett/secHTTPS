import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../../../../src/domain/repositories/INotificationRepository';
import { GetCertificateNotificationsUseCase } from '../../../../../src/domain/usecases/notifications/GetCertificateNotificationsUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../../../src/types/errors';
import { Notification, NotificationResult } from '../../../../../src/types/notification';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para GetCertificateNotificationsUseCase
 * Verifica validación de UUID, existencia del certificado y recuperación de notificaciones
 */
describe('GetCertificateNotificationsUseCase', () => {
  let useCase: GetCertificateNotificationsUseCase;
  let mockCertRepo: ICertificateRepository;
  let mockNotifRepo: INotificationRepository;

  const validUUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

  const activeCert: Certificate = {
    id: validUUID,
    fileName: 'cert-test.crt',
    startDate: '2026-01-01',
    expirationDate: '2027-01-01',
    server: 'web-01',
    filePath: '/etc/ssl/cert-test.crt',
    client: 'Empresa Test',
    configPath: '/etc/nginx/sites/test.conf',
    responsibleContacts: [{ email: 'admin@test.com', language: 'es' }],
    status: CertificateStatus.ACTIVE,
    expirationStatus: ExpirationStatus.NORMAL,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const notification: Notification = {
    id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
    certificateId: validUUID,
    sentAt: '2026-02-18T00:00:00Z',
    recipientEmails: ['admin@test.com'],
    subject: 'Certificado WARNING',
    expirationStatusAtTime: ExpirationStatus.WARNING,
    result: NotificationResult.SENT,
    errorMessage: null,
  };

  beforeEach(() => {
    mockCertRepo = {
      findAll: vi.fn(),
      findById: vi.fn().mockResolvedValue(activeCert),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockNotifRepo = {
      findAll: vi.fn(),
      findByCertificateId: vi.fn().mockResolvedValue([notification]),
      findLastByCertificateId: vi.fn(),
      save: vi.fn(),
    };

    useCase = new GetCertificateNotificationsUseCase(mockCertRepo, mockNotifRepo);
  });

  it('debería devolver las notificaciones de un certificado válido', async () => {
    const result = await useCase.execute(validUUID);

    expect(result.total).toBe(1);
    expect(result.notifications).toEqual([notification]);
    expect(mockNotifRepo.findByCertificateId).toHaveBeenCalledWith(validUUID);
  });

  it('debería lanzar ValidationError para UUID inválido', async () => {
    await expect(useCase.execute('no-es-uuid')).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute('no-es-uuid')).rejects.toMatchObject({
      code: ErrorCode.INVALID_UUID,
    });
  });

  it('debería lanzar NotFoundError si el certificado no existe', async () => {
    vi.mocked(mockCertRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validUUID)).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute(validUUID)).rejects.toMatchObject({
      code: ErrorCode.CERTIFICATE_NOT_FOUND,
    });
  });

  it('debería devolver total 0 cuando el certificado no tiene notificaciones', async () => {
    vi.mocked(mockNotifRepo.findByCertificateId).mockResolvedValue([]);

    const result = await useCase.execute(validUUID);

    expect(result.total).toBe(0);
    expect(result.notifications).toEqual([]);
  });

  it('debería verificar primero el UUID y luego buscar el certificado', async () => {
    // UUID inválido no debe llegar al repositorio
    await expect(useCase.execute('')).rejects.toBeInstanceOf(ValidationError);
    expect(mockCertRepo.findById).not.toHaveBeenCalled();
  });
});
