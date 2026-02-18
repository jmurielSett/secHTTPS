import { Certificate, CertificateStatus, UpdateCertificateDTO } from '../../../types/certificate';
import { ErrorCode, NotFoundError, ValidationError } from '../../../types/errors';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';
import { CertificateExpirationService } from '../../services/CertificateExpirationService';
import { CertificateDateRange } from '../../valueObjects/CertificateDateRange';
import { EmailAddress } from '../../valueObjects/EmailAddress';
import { LanguageCode } from '../../valueObjects/LanguageCode';

export class UpdateCertificateUseCase {
  constructor(
    private readonly repository: ICertificateRepository,
    private readonly expirationService: CertificateExpirationService
  ) {}

  async execute(id: string, data: UpdateCertificateDTO): Promise<Certificate> {
    // Validar UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new ValidationError(ErrorCode.INVALID_UUID, 'El ID proporcionado no es un UUID válido');
    }

    // Verificar que el certificado existe
    const certificate = await this.repository.findById(id);
    if (!certificate) {
      throw new NotFoundError(ErrorCode.CERTIFICATE_NOT_FOUND, `Certificado con ID ${id} no encontrado`);
    }

    // Verificar que el certificado no esté eliminado
    if (certificate.status === CertificateStatus.DELETED) {
      throw new ValidationError(
        ErrorCode.CERTIFICATE_ALREADY_DELETED,
        'No se puede modificar un certificado eliminado'
      );
    }

    // Validar que expirationDate sea posterior a startDate
    const finalStartDate = data.startDate || certificate.startDate;
    const finalExpirationDate = data.expirationDate || certificate.expirationDate;
    CertificateDateRange.create(finalStartDate, finalExpirationDate);

    // Validar responsibleContacts si se proporciona
    if (data.responsibleContacts !== undefined) {
      if (!Array.isArray(data.responsibleContacts) || data.responsibleContacts.length === 0) {
        throw new ValidationError(
          ErrorCode.INVALID_EMAIL_LIST,
          'responsibleContacts debe ser un array con al menos un contacto'
        );
      }
      for (const contact of data.responsibleContacts) {
        EmailAddress.create(contact.email);
        LanguageCode.create(contact.language);
      }
    }

    // Actualizar certificado
    const updatedCertificate: Certificate = {
      ...certificate,
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Recalcular estado de expiración si cambió la fecha
    if (data.expirationDate) {
      updatedCertificate.expirationStatus = CertificateExpirationService.calculateExpirationStatus(
        updatedCertificate.expirationDate
      );
    }

    return await this.repository.update(updatedCertificate);
  }
}
