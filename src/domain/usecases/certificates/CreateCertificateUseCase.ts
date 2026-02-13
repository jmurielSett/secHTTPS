import { randomUUID } from 'node:crypto';
import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { INotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { Certificate, CertificateStatus, CreateCertificateDTO } from '../../../types/certificate';
import { ErrorCode, ValidationError } from '../../../types/errors';
import { Notification, NotificationResult } from '../../../types/notification';
import { CertificateExpirationService } from '../../services/CertificateExpirationService';
import { IEmailService } from '../../services/IEmailService';

export class CreateCertificateUseCase {
  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly notificationRepository?: INotificationRepository,
    private readonly emailService?: IEmailService
  ) {}

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
    const savedCertificate = await this.certificateRepository.save(certificate);

    // Enviar email de notificación (no bloquea si falla)
    if (this.emailService) {
      this.sendCreationNotification(savedCertificate).catch(error => {
        console.error(`Error al enviar email de notificación para certificado ${savedCertificate.id}:`, error);
        // No lanzar el error para no interrumpir la creación del certificado
      });
    }

    return savedCertificate;
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

  /**
   * Envía el email de notificación de creación de certificado y registra en BD
   * @param certificate Certificado recién creado
   */
  private async sendCreationNotification(certificate: Certificate): Promise<void> {
    if (!this.emailService) {
      return;
    }

    const subject = `✅ Nuevo Certificado Registrado: ${certificate.fileName}`;
    let result = NotificationResult.SENT;
    let errorMessage: string | null = null;

    try {
      await this.emailService.sendCertificateCreationNotification(certificate);
      console.log(`Email de creación enviado para certificado ${certificate.id}`);
    } catch (error) {
      console.error(`Error al enviar email de creación:`, error);
      result = NotificationResult.ERROR;
      errorMessage = error instanceof Error ? error.message : 'Error desconocido al enviar email';
    }

    // Registrar notificación en BD (siempre, tanto si fue exitoso como si falló)
    if (this.notificationRepository) {
      try {
        const notification: Notification = {
          id: randomUUID(),
          certificateId: certificate.id,
          sentAt: new Date().toISOString(),
          recipientEmails: certificate.responsibleEmails,
          subject,
          expirationStatusAtTime: certificate.expirationStatus, // NORMAL para certificados recién creados
          result,
          errorMessage
        };

        await this.notificationRepository.save(notification);
        console.log(`Notificación de creación registrada en BD: ${notification.id}`);
      } catch (dbError) {
        console.error(`Error al registrar notificación en BD:`, dbError);
        // No lanzar error para no interrumpir el flujo
      }
    }

    // Lanzar error solo si falló el envío del email
    if (result === NotificationResult.ERROR) {
      throw new Error(errorMessage || 'Error al enviar email de creación');
    }
  }
}
