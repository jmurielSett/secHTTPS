import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { GetCertificateByIdUseCase } from '../../../../../src/domain/usecases/certificates/GetCertificateByIdUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../../../src/types/errors';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para GetCertificateByIdUseCase
 * Verifica validación de UUID y búsqueda en repositorio
 */
describe('GetCertificateByIdUseCase', () => {
  let useCase: GetCertificateByIdUseCase;
  let mockRepo: ICertificateRepository;

  const validUUID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const cert: Certificate = {
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

  beforeEach(() => {
    mockRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    useCase = new GetCertificateByIdUseCase(mockRepo);
  });

  it('debería devolver el certificado para un UUID válido', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(cert);

    const result = await useCase.execute(validUUID);

    expect(result).toEqual(cert);
    expect(mockRepo.findById).toHaveBeenCalledWith(validUUID);
  });

  it('debería lanzar ValidationError si el ID no es un UUID válido', async () => {
    await expect(useCase.execute('no-es-uuid')).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute('no-es-uuid')).rejects.toMatchObject({
      code: ErrorCode.INVALID_UUID,
    });
  });

  it('debería lanzar ValidationError para un UUID vacío', async () => {
    await expect(useCase.execute('')).rejects.toBeInstanceOf(ValidationError);
  });

  it('debería lanzar NotFoundError cuando el certificado no existe', async () => {
    vi.mocked(mockRepo.findById).mockResolvedValue(null);

    await expect(useCase.execute(validUUID)).rejects.toBeInstanceOf(NotFoundError);
    await expect(useCase.execute(validUUID)).rejects.toMatchObject({
      code: ErrorCode.CERTIFICATE_NOT_FOUND,
    });
  });
});
