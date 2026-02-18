import { randomUUID } from 'node:crypto';
import { Certificate, CertificateStatus, CreateCertificateDTO } from '../../../types/certificate';
import { ErrorCode, ValidationError } from '../../../types/errors';
import { Notification, NotificationResult } from '../../../types/notification';
import { logError, logInfo } from '../../../utils/logger';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';
import { INotificationRepository } from '../../repositories/INotificationRepository';
import { CertificateExpirationService } from '../../services/CertificateExpirationService';
import { IEmailService } from '../../services/IEmailService';
import { EmailTemplate, ILocalizationService, SupportedLanguage } from '../../services/ILocalizationService';

export class CreateCertificateUseCase {
  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly notificationRepository?: INotificationRepository,
    private readonly emailService?: IEmailService,
    private readonly localizationService?: ILocalizationService
  ) {}

  async execute(data: CreateCertificateDTO): Promise<Certificate> {
    // Validar campos requeridos
    this.validateRequiredFields(data);
    
    // Validar que responsibleContacts no esté vacío
    this.validateResponsibleContacts(data.responsibleContacts);
    
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
      responsibleContacts: data.responsibleContacts,
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
        logError(`[CreateCertificateUseCase] Error al enviar email de notificación para certificado ${savedCertificate.id}`, error as Error);
        // No lanzar el error para no interrumpir la creación del certificado
      });
    }

    return savedCertificate;
  }

  private validateRequiredFields(data: CreateCertificateDTO): void {
    const { fileName, startDate, expirationDate, server, filePath, client, configPath, responsibleContacts } = data;
    
    if (!fileName || !startDate || !expirationDate || !server || !filePath || !client || !configPath || !responsibleContacts) {
      throw new ValidationError(
        ErrorCode.REQUIRED_FIELDS,
        'Faltan campos obligatorios'
      );
    }
  }

  private validateResponsibleContacts(contacts: { email: string; language: string; name?: string }[]): void {
    if (!Array.isArray(contacts) || contacts.length === 0) {
      throw new ValidationError(
        ErrorCode.INVALID_EMAIL_LIST,
        'La lista de contactos responsables debe contener al menos un contacto válido'
      );
    }
    
    // Validar que cada contacto tenga email y language
    for (const contact of contacts) {
      if (!contact.email || !contact.language) {
        throw new ValidationError(
          ErrorCode.INVALID_EMAIL_LIST,
          'Cada contacto debe tener email y language'
        );
      }
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
   * Envía email a un contacto individual
   */
  private async sendEmailToContact(
    contact: { email: string; language: string; name?: string },
    certificate: Certificate
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const content = this.localizationService!.getEmailContent(
        EmailTemplate.CERTIFICATE_CREATION,
        certificate,
        contact.language as SupportedLanguage
      );

      await this.emailService!.sendEmail(
        contact.email,
        content.subject,
        content.htmlBody,
        content.textBody
      );
      
      logInfo(`[CreateCertificateUseCase] Email de creación enviado a ${contact.email} (${contact.language})`);
      return { success: true };
    } catch (error) {
      logError(`[CreateCertificateUseCase] Error al enviar email a ${contact.email}`, error as Error);
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Registra una notificación en la base de datos
   */
  private async saveNotificationRecord(
    certificate: Certificate,
    allRecipientEmails: string[],
    result: NotificationResult,
    successCount: number,
    errorMessage: string | null
  ): Promise<void> {
    if (!this.notificationRepository) {
      return;
    }

    try {
      const notification: Notification = {
        id: randomUUID(),
        certificateId: certificate.id,
        sentAt: new Date().toISOString(),
        recipientEmails: allRecipientEmails,
        subject: `✅ Nuevo Certificado Registrado: ${certificate.fileName}`,
        expirationStatusAtTime: certificate.expirationStatus,
        result,
        errorMessage: errorMessage ? `${successCount}/${allRecipientEmails.length} enviados. Errores: ${errorMessage}` : null
      };

      await this.notificationRepository.save(notification);
      logInfo(`[CreateCertificateUseCase] Notificación de creación registrada en BD: ${notification.id}`);
    } catch (dbError) {
      logError('[CreateCertificateUseCase] Error al registrar notificación en BD', dbError as Error);
    }
  }

  /**
   * Envía el email de notificación de creación de certificado y registra en BD
   * @param certificate Certificado recién creado
   */
  private async sendCreationNotification(certificate: Certificate): Promise<void> {
    if (!this.emailService || !this.localizationService) {
      return;
    }

    const allRecipientEmails: string[] = [];
    let errorMessage: string | null = null;
    let successCount = 0;
    let errorCount = 0;

    // Enviar email individual a cada contacto en su idioma
    for (const contact of certificate.responsibleContacts) {
      allRecipientEmails.push(contact.email);
      const sendResult = await this.sendEmailToContact(contact, certificate);
      
      if (sendResult.success) {
        successCount++;
      } else {
        errorCount++;
        const currentError = sendResult.error || 'Error desconocido';
        errorMessage = errorMessage ? `${errorMessage}; ${currentError}` : currentError;
      }
    }

    // Determinar resultado general
    let result: NotificationResult;
    if (errorCount === 0) {
      result = NotificationResult.SENT;
    } else if (successCount === 0) {
      result = NotificationResult.ERROR;
    } else {
      result = NotificationResult.SENT; // Si al menos uno tuvo éxito, consideramos parcialmente exitoso
    }

    // Registrar notificación en BD
    await this.saveNotificationRecord(certificate, allRecipientEmails, result, successCount, errorMessage);

    // Lanzar error solo si fallaron TODOS los envíos
    if (successCount === 0 && errorCount > 0) {
      throw new Error(errorMessage || 'Error al enviar emails de creación');
    }
  }
}
