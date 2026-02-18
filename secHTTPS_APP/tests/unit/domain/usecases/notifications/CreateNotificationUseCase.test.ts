import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../../../../src/domain/repositories/INotificationRepository';
import { CreateNotificationUseCase } from '../../../../../src/domain/usecases/notifications/CreateNotificationUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../../../src/types/errors';
import { CreateNotificationDTO, NotificationResult } from '../../../../../src/types/notification';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para CreateNotificationUseCase
 * Verifica validaciones de campos, UUID, certificado existente y regla ERROR→errorMessage
 */
describe('CreateNotificationUseCase', () => {
  let useCase: CreateNotificationUseCase;
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

  const validDTO: CreateNotificationDTO = {
    certificateId: validUUID,
    recipientEmails: ['admin@test.com'],
    subject: 'Certificado por expirar',
    expirationStatusAtTime: ExpirationStatus.WARNING,
    result: NotificationResult.SENT,
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
      findByCertificateId: vi.fn(),
      findLastByCertificateId: vi.fn(),
      save: vi.fn().mockImplementation((n) => Promise.resolve(n)),
    };

    useCase = new CreateNotificationUseCase(mockCertRepo, mockNotifRepo);
  });

  it('debería crear y devolver la notificación con datos válidos', async () => {
    const result = await useCase.execute(validDTO);

    expect(result.certificateId).toBe(validUUID);
    expect(result.result).toBe(NotificationResult.SENT);
    expect(result.recipientEmails).toEqual(['admin@test.com']);
    expect(result.errorMessage).toBeNull();
    expect(mockNotifRepo.save).toHaveBeenCalledOnce();
  });

  it('debería lanzar ValidationError si faltan campos requeridos', async () => {
    const dto = { ...validDTO, subject: '' };

    await expect(useCase.execute(dto as CreateNotificationDTO)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto as CreateNotificationDTO)).rejects.toMatchObject({
      code: ErrorCode.REQUIRED_FIELDS,
    });
  });

  it('debería lanzar ValidationError si certificateId no es UUID válido', async () => {
    const dto = { ...validDTO, certificateId: 'no-es-uuid' };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_UUID,
    });
  });

  it('debería lanzar ValidationError si recipientEmails está vacío', async () => {
    const dto = { ...validDTO, recipientEmails: [] };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_EMAIL_LIST,
    });
  });

  it('debería lanzar ValidationError si result es ERROR pero no hay errorMessage', async () => {
    const dto = { ...validDTO, result: NotificationResult.ERROR };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.ERROR_MESSAGE_REQUIRED,
    });
  });

  it('debería aceptar result ERROR cuando se proporciona errorMessage', async () => {
    const dto = { ...validDTO, result: NotificationResult.ERROR, errorMessage: 'SMTP timeout' };

    const result = await useCase.execute(dto);

    expect(result.result).toBe(NotificationResult.ERROR);
    expect(result.errorMessage).toBe('SMTP timeout');
  });

  it('debería lanzar NotFoundError si el certificado no existe', async () => {
    vi.mocked(mockCertRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validDTO)).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute(validDTO)).rejects.toMatchObject({
      code: ErrorCode.CERTIFICATE_NOT_FOUND,
    });
  });
});
