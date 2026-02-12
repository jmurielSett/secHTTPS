import { randomUUID } from 'crypto';
import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { Certificate, CreateCertificateDTO } from '../../../types/certificate';
import { CertificateExpirationService } from '../../services/CertificateExpirationService';

export class CreateCertificateUseCase {
  constructor(private certificateRepository: ICertificateRepository) {}

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
      status: 'ACTIVE',
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
      throw new Error('Faltan campos requeridos');
    }
  }

  private validateResponsibleEmails(emails: string[]): void {
    if (!Array.isArray(emails) || emails.length === 0) {
      throw new Error('responsibleEmails debe contener al menos un email');
    }
  }

  private validateDates(startDate: string, expirationDate: string): void {
    const start = new Date(startDate);
    const expiration = new Date(expirationDate);
    
    if (expiration <= start) {
      throw new Error('expirationDate debe ser posterior a startDate');
    }
  }
}
