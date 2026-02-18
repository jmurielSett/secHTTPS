import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { GetCertificatesUseCase } from '../../../../../src/domain/usecases/certificates/GetCertificatesUseCase';
import { Certificate, CertificateStatus } from '../../../../../src/types/certificate';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para GetCertificatesUseCase
 * Verifica que delega correctamente al repositorio y construye la respuesta
 */
describe('GetCertificatesUseCase', () => {
  let useCase: GetCertificatesUseCase;
  let mockRepo: ICertificateRepository;

  const activeCert: Certificate = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
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

    useCase = new GetCertificatesUseCase(mockRepo);
  });

  it('debería devolver total y array de certificados', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([activeCert]);

    const result = await useCase.execute({});

    expect(result.total).toBe(1);
    expect(result.certificates).toEqual([activeCert]);
  });

  it('debería devolver total 0 y array vacío cuando no hay certificados', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([]);

    const result = await useCase.execute({});

    expect(result.total).toBe(0);
    expect(result.certificates).toEqual([]);
  });

  it('debería pasar los filtros al repositorio', async () => {
    vi.mocked(mockRepo.findAll).mockResolvedValue([activeCert]);
    const filters = { client: 'Empresa Test', status: CertificateStatus.ACTIVE };

    await useCase.execute(filters);

    expect(mockRepo.findAll).toHaveBeenCalledWith(filters);
  });

  it('debería devolver múltiples certificados con el total correcto', async () => {
    const secondCert: Certificate = { ...activeCert, id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' };
    vi.mocked(mockRepo.findAll).mockResolvedValue([activeCert, secondCert]);

    const result = await useCase.execute({});

    expect(result.total).toBe(2);
    expect(result.certificates).toHaveLength(2);
  });
});
