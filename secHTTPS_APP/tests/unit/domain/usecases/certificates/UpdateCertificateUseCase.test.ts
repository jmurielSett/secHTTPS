import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { CertificateExpirationService } from '../../../../../src/domain/services/CertificateExpirationService';
import { UpdateCertificateUseCase } from '../../../../../src/domain/usecases/certificates/UpdateCertificateUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../../../src/types/errors';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para UpdateCertificateUseCase
 * Verifica validaciones, actualización y recálculo de expirationStatus
 */
describe('UpdateCertificateUseCase', () => {
  let useCase: UpdateCertificateUseCase;
  let mockRepo: ICertificateRepository;
  let expirationService: CertificateExpirationService;

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

  const deletedCert: Certificate = { ...activeCert, status: CertificateStatus.DELETED };

  beforeEach(() => {
    mockRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn().mockImplementation((cert: Certificate) => Promise.resolve(cert)),
      delete: vi.fn(),
    };

    expirationService = new CertificateExpirationService();
    useCase = new UpdateCertificateUseCase(mockRepo, expirationService);
  });

  it('debería actualizar los campos del certificado correctamente', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);

    const result = await useCase.execute(validUUID, { client: 'Nuevo Cliente' });

    expect(result.client).toBe('Nuevo Cliente');
    expect(mockRepo.update).toHaveBeenCalledOnce();
  });

  it('debería recalcular expirationStatus cuando cambia expirationDate', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);
    // Fecha posterior a startDate (2026-01-01) pero ya expirada (antes de hoy, 2026-02-18)
    const expiredButValidDate = '2026-01-15';

    const result = await useCase.execute(validUUID, { expirationDate: expiredButValidDate });

    expect(result.expirationStatus).toBe(ExpirationStatus.EXPIRED);
  });

  it('NO debería cambiar expirationStatus si no se modifica expirationDate', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);

    const result = await useCase.execute(validUUID, { client: 'Otro Cliente' });

    expect(result.expirationStatus).toBe(ExpirationStatus.NORMAL);
  });

  it('debería lanzar ValidationError para UUID inválido', async () => {
    await expect(useCase.execute('no-es-uuid', { client: 'X' })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute('no-es-uuid', { client: 'X' })).rejects.toMatchObject({
      code: ErrorCode.INVALID_UUID,
    });
  });

  it('debería lanzar NotFoundError si el certificado no existe', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validUUID, { client: 'X' })).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute(validUUID, { client: 'X' })).rejects.toMatchObject({
      code: ErrorCode.CERTIFICATE_NOT_FOUND,
    });
  });

  it('debería lanzar ValidationError si el certificado ya está DELETED', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(deletedCert);

    await expect(useCase.execute(validUUID, { client: 'X' })).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(validUUID, { client: 'X' })).rejects.toMatchObject({
      code: ErrorCode.CERTIFICATE_ALREADY_DELETED,
    });
  });

  it('debería lanzar ValidationError si la nueva expirationDate no es posterior a startDate', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);
    // startDate es 2026-01-01, ponemos expirationDate anterior
    const dto = { expirationDate: '2025-12-31' };

    await expect(useCase.execute(validUUID, dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(validUUID, dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_DATE_RANGE,
    });
  });
});
