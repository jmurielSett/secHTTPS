import { randomUUID } from 'node:crypto';
import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { Certificate, CertificateStatus, CreateCertificateDTO } from '../../../types/certificate';
import { ErrorCode, ValidationError } from '../../../types/errors';
import { CertificateExpirationService } from '../../services/CertificateExpirationService';

export class CreateCertificateUseCase {
  constructor(private readonly certificateRepository: ICertificateRepository) {}

  async execute(data: CreateCertificateDTO): Promise<Certificate> {
    // Validar campos requeridos
    this.validateRequiredFields(data);
    
    // Validar que responsibleEmails no esté vacío
    this.validateResponsibleEmails(data.responsibleEmails);
    
    // Validar que expirationDate sea posterior a startDate
    this.validateDates(data.startDate, data.expirationDate);

    // Crear el certificado
    const certificate: Certificate = {
      id: randomUUID(),
      fileName: data.fileName,
      startDate: data.startDate,
      expirationDate: data.expirationDate,
      server: data.server,
      filePath: data.filePath,
      client: data.client,
      configPath: data.configPath,
      responsibleEmails: data.responsibleEmails,
      status: CertificateStatus.ACTIVE,
      expirationStatus: CertificateExpirationService.calculateExpirationStatus(data.expirationDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Guardar en el repositorio
    return await this.certificateRepository.save(certificate);
  }

  private validateRequiredFields(data: CreateCertificateDTO): void {
    const { fileName, startDate, expirationDate, server, filePath, client, configPath, responsibleEmails } = data;
    
    if (!fileName || !startDate || !expirationDate || !server || !filePath || !client || !configPath || !responsibleEmails) {
      throw new ValidationError(
        ErrorCode.REQUIRED_FIELDS,
        'Faltan campos obligatorios'
      );
    }
  }

  private validateResponsibleEmails(emails: string[]): void {
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new ValidationError(
        ErrorCode.INVALID_EMAIL_LIST,
        'La lista de mails de responsables debe contener al menos un email válido'
      );
    }
  }

  private validateDates(startDate: string, expirationDate: string): void {
    const start = new Date(startDate);
    const expiration = new Date(expirationDate);
    
    if (expiration <= start) {
      throw new ValidationError(
        ErrorCode.INVALID_DATE_RANGE,
        'La fecha de expiración debe ser posterior a la fecha de inicio'
      );
    }
  }
}
