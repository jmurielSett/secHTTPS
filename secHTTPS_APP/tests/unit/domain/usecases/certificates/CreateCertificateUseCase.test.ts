import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ICertificateRepository } from '../../../../../src/domain/repositories/ICertificateRepository';
import { INotificationRepository } from '../../../../../src/domain/repositories/INotificationRepository';
import { IEmailService } from '../../../../../src/domain/services/IEmailService';
import { ILocalizationService, LocalizedEmailContent } from '../../../../../src/domain/services/ILocalizationService';
import { CreateCertificateUseCase } from '../../../../../src/domain/usecases/certificates/CreateCertificateUseCase';
import { Certificate, CertificateStatus, CreateCertificateDTO } from '../../../../../src/types/certificate';
import { ErrorCode, ValidationError } from '../../../../../src/types/errors';
import { ExpirationStatus } from '../../../../../src/types/shared';

/**
 * Tests para CreateCertificateUseCase
 * Verifica validaciones, creación, cálculo automático de expirationStatus
 * y comportamiento opcional del email
 */
describe('CreateCertificateUseCase', () => {
  let mockCertRepo: ICertificateRepository;
  let mockNotifRepo: INotificationRepository;
  let mockEmailService: IEmailService;
  let mockLocService: ILocalizationService;

  const baseDTO: CreateCertificateDTO = {
    fileName: 'web-prod.crt',
    startDate: '2026-01-01',
    expirationDate: '2027-06-01',
    server: 'web-prod-01',
    filePath: '/etc/ssl/web-prod.crt',
    client: 'Empresa Test',
    configPath: '/etc/nginx/sites/test.conf',
    responsibleContacts: [{ email: 'admin@test.com', language: 'es' }],
  };

  const savedCert: Certificate = {
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    ...baseDTO,
    status: CertificateStatus.ACTIVE,
    expirationStatus: ExpirationStatus.NORMAL,
    createdAt: '2026-02-18T00:00:00Z',
    updatedAt: '2026-02-18T00:00:00Z',
  };

  const locContent: LocalizedEmailContent = {
    subject: 'Nuevo certificado',
    htmlBody: '<p>Nuevo</p>',
    textBody: 'Nuevo',
  };

  beforeEach(() => {
    mockCertRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      save: vi.fn().mockResolvedValue(savedCert),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockNotifRepo = {
      findAll: vi.fn(),
      findByCertificateId: vi.fn(),
      findLastByCertificateId: vi.fn(),
      save: vi.fn().mockResolvedValue({}),
    };

    mockEmailService = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
      verifyConnection: vi.fn(),
    };

    mockLocService = {
      getEmailContent: vi.fn().mockReturnValue(locContent),
      isSupportedLanguage: vi.fn().mockReturnValue(true),
      getDefaultLanguage: vi.fn().mockReturnValue('es'),
      normalizeLanguage: vi.fn().mockImplementation((lang: string) => lang),
    };
  });

  it('debería crear un certificado con estado ACTIVE', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);

    const result = await useCase.execute(baseDTO);

    expect(result).toEqual(savedCert);
    expect(mockCertRepo.save).toHaveBeenCalledOnce();
    const saved = vi.mocked(mockCertRepo.save).mock.calls[0][0];
    expect(saved.status).toBe(CertificateStatus.ACTIVE);
  });

  it('debería calcular expirationStatus automáticamente según la fecha de expiración', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);

    await useCase.execute(baseDTO);

    const saved = vi.mocked(mockCertRepo.save).mock.calls[0][0];
    // '2027-06-01' está muy lejos → NORMAL
    expect(saved.expirationStatus).toBe(ExpirationStatus.NORMAL);
  });

  it('debería lanzar ValidationError si faltan campos obligatorios', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);
    const dto = { ...baseDTO, fileName: '' };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.REQUIRED_FIELDS,
    });
  });

  it('debería lanzar ValidationError si expirationDate no es posterior a startDate', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);
    const dto = { ...baseDTO, startDate: '2026-06-01', expirationDate: '2026-01-01' };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_DATE_RANGE,
    });
  });

  it('debería lanzar ValidationError si responsibleContacts está vacío', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);
    const dto = { ...baseDTO, responsibleContacts: [] };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_EMAIL_LIST,
    });
  });

  it('debería lanzar ValidationError si un contacto no tiene language', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo);
    const dto = { ...baseDTO, responsibleContacts: [{ email: 'admin@test.com', language: '' }] };

    await expect(useCase.execute(dto)).rejects.toBeInstanceOf(ValidationError);
    await expect(useCase.execute(dto)).rejects.toMatchObject({
      code: ErrorCode.INVALID_LANGUAGE_CODE,
    });
  });

  it('debería crear el certificado aunque no se proporcione emailService', async () => {
    const useCase = new CreateCertificateUseCase(mockCertRepo); // sin emailService

    const result = await useCase.execute(baseDTO);

    expect(result).toEqual(savedCert);
    expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
  });

  it('debería intentar enviar email si se proporciona emailService (no bloquea el resultado)', async () => {
    const useCase = new CreateCertificateUseCase(
      mockCertRepo,
      mockNotifRepo,
      mockEmailService,
      mockLocService
    );

    const result = await useCase.execute(baseDTO);

    // El certificado retorna correctamente independientemente del email
    expect(result).toEqual(savedCert);
    expect(mockCertRepo.save).toHaveBeenCalledOnce();
  });
});
