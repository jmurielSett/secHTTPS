import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { UpdateCertificateStatusUseCase } from '../../../../../src/domain/usecases/certificates/UpdateCertificateStatusUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../../../src/types/errors';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para UpdateCertificateStatusUseCase
 * Solo permite cambiar el estado a DELETED
 */
describe('UpdateCertificateStatusUseCase', () => {
  let useCase: UpdateCertificateStatusUseCase;
  let mockRepo: ICertificateRepository;

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

    useCase = new UpdateCertificateStatusUseCase(mockRepo);
  });

  it('debería marcar el certificado como DELETED correctamente', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);

    const result = await useCase.execute(validUUID, { status: CertificateStatus.DELETED });

    expect(result.status).toBe(CertificateStatus.DELETED);
    expect(mockRepo.update).toHaveBeenCalledOnce();
  });

  it('debería lanzar ValidationError si el status no es DELETED', async () => {
    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.ACTIVE })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.ACTIVE })
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_STATUS });
  });

  it('debería lanzar NotFoundError si el certificado no existe', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.DELETED })
    ).rejects.toBeInstanceOf(NotFoundError);

    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.DELETED })
    ).rejects.toMatchObject({ code: ErrorCode.CERTIFICATE_NOT_FOUND });
  });

  it('debería lanzar ValidationError si el certificado ya está DELETED', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(deletedCert);

    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.DELETED })
    ).rejects.toBeInstanceOf(ValidationError);

    await expect(
      useCase.execute(validUUID, { status: CertificateStatus.DELETED })
    ).rejects.toMatchObject({ code: ErrorCode.CERTIFICATE_ALREADY_DELETED });
  });

  it('el certificado actualizado mantiene los mismos datos excepto status y updatedAt', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(activeCert);

    const result = await useCase.execute(validUUID, { status: CertificateStatus.DELETED });

    expect(result.status).toBe(CertificateStatus.DELETED);
    expect(result.fileName).toBe(activeCert.fileName);
    expect(result.client).toBe(activeCert.client);
    expect(result.updatedAt).not.toBe(activeCert.updatedAt);
  });
});
