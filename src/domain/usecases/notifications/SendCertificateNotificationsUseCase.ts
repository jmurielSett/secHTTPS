import { randomUUID } from 'node:crypto';
import { Certificate, CertificateStatus } from '../../../types/certificate';
import { CreateNotificationDTO, NotificationResult, NotificationResultDetail, NotificationSummary } from '../../../types/notification';
import { ExpirationStatus, NOTIFICATION_FREQUENCY } from '../../../types/shared';
import { ICertificateRepository } from '../../repositories/ICertificateRepository';
import { INotificationRepository } from '../../repositories/INotificationRepository';
import { IEmailService } from '../../services/IEmailService';
import { EmailTemplate, ILocalizationService, SupportedLanguage } from '../../services/ILocalizationService';

/**
 * UseCase que orquesta el proceso de envío de notificaciones
 * de certificados próximos a expirar o expirados.
 * 
 * Regla de negocio implementada:
 * - Certificados WARNING: notificar cada 48 horas (2 días)
 * - Certificados EXPIRED: notificar cada 24 horas (1 día)
 * - Solo certificados ACTIVE (no DELETED)
 * - Enviar a los emails responsables del certificado
 */
export class SendCertificateNotificationsUseCase {
  constructor(
    private readonly certificateRepository: ICertificateRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly emailService: IEmailService,
    private readonly localizationService: ILocalizationService
  ) {}

  /**
   * Ejecuta el proceso de notificaciones
   * @param force Si es true, ignora la frecuencia y envía siempre (guarda con result=FORCE)
   * @returns Resumen con estadísticas y resultados detallados
   */
  async execute(force: boolean = false): Promise<NotificationSummary> {
    const executedAt = new Date().toISOString();
    const results: NotificationResultDetail[] = [];

    // 1. Obtener certificados WARNING o EXPIRED que estén ACTIVE
    const warningCerts = await this.certificateRepository.findAll({
      status: CertificateStatus.ACTIVE,
      expirationStatus: ExpirationStatus.WARNING
    });

    const expiredCerts = await this.certificateRepository.findAll({
      status: CertificateStatus.ACTIVE,
      expirationStatus: ExpirationStatus.EXPIRED
    });

    const allCertificates = [...warningCerts, ...expiredCerts];

    // 2. Filtrar certificados que necesitan notificación según frecuencia
    const certsToNotify = force 
      ? allCertificates 
      : await this.filterCertificatesNeedingNotification(allCertificates);

    // 3. Enviar notificaciones
    for (const cert of certsToNotify) {
      const result = await this.sendNotificationForCertificate(cert, force);
      results.push(result);
    }

    // 4. Calcular estadísticas
    const totalSent = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;

    return {
      executedAt,
      totalCertificatesChecked: allCertificates.length,
      totalCertificatesNeedingNotification: certsToNotify.length,
      totalNotificationsSent: totalSent,
      totalNotificationsFailed: totalFailed,
      results
    };
  }

  /**
   * Filtra certificados que necesitan notificación según la última notificación enviada
   */
  private async filterCertificatesNeedingNotification(
    certificates: Certificate[]
  ): Promise<Certificate[]> {
    const filtered: Certificate[] = [];

    for (const cert of certificates) {
      const shouldNotify = await this.shouldSendNotification(cert);
      if (shouldNotify) {
        filtered.push(cert);
      }
    }

    return filtered;
  }

  /**
   * Determina si se debe enviar notificación para un certificado
   * según el tiempo transcurrido desde la última notificación
   * NOTA: findLastByCertificateId ya excluye notificaciones FORCE
   */
  private async shouldSendNotification(certificate: Certificate): Promise<boolean> {
    const lastNotification = await this.notificationRepository.findLastByCertificateId(
      certificate.id
    );

    // Si nunca se ha enviado notificación (o solo FORCE), enviar
    if (!lastNotification) {
      return true;
    }

    // Calcular horas desde última notificación
    const hoursSinceLastNotification = this.calculateHoursSince(lastNotification.sentAt);

    // Aplicar regla según estado de expiración
    if (certificate.expirationStatus === ExpirationStatus.EXPIRED) {
      return hoursSinceLastNotification >= NOTIFICATION_FREQUENCY.EXPIRED_HOURS;
    }

    if (certificate.expirationStatus === ExpirationStatus.WARNING) {
      return hoursSinceLastNotification >= NOTIFICATION_FREQUENCY.WARNING_HOURS;
    }

    return false;
  }

  /**
   * Calcula las horas transcurridas desde una fecha
   */
  private calculateHoursSince(pastDate: string): number {
    const now = Date.now();
    const past = new Date(pastDate).getTime();
    return (now - past) / (1000 * 60 * 60);
  }

  /**
   * Envía la notificación para un certificado específico
   * y guarda el registro en la base de datos
   */
  private async sendNotificationForCertificate(
    certificate: Certificate,
    isForceMode: boolean = false
  ): Promise<NotificationResultDetail> {
    const notificationId = randomUUID();
    const sentAt = new Date().toISOString();

    const baseResult: NotificationResultDetail = {
      certificateId: certificate.id,
      certificateFileName: certificate.fileName,
      success: false
    };

    const allRecipientEmails: string[] = [];
    let overallErrorMessage: string | null = null;
    let successCount = 0;
    let errorCount = 0;

    // Determinar template según estado de expiración
    const emailTemplate = certificate.expirationStatus === ExpirationStatus.EXPIRED
      ? EmailTemplate.CERTIFICATE_EXPIRED
      : EmailTemplate.CERTIFICATE_WARNING;

    try {
      // Enviar email individual a cada contacto en su idioma
      for (const contact of certificate.responsibleContacts) {
        allRecipientEmails.push(contact.email);
        
        try {
          const content = this.localizationService.getEmailContent(
            emailTemplate,
            certificate,
            contact.language as SupportedLanguage
          );

          await this.emailService.sendEmail(
            contact.email,
            content.subject,
            content.htmlBody,
            content.textBody
          );
          
          successCount++;
          console.log(`✅ Email de notificación enviado a ${contact.email} (${contact.language})`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Error al enviar email a ${contact.email}:`, error);
          const currentError = this.buildErrorMessage(error);
          overallErrorMessage = overallErrorMessage ? `${overallErrorMessage}; ${currentError}` : currentError;
        }
      }

      // Si al menos uno tuvo éxito, consideramos la notificación como enviada
      if (successCount > 0) {
        const notificationDTO: CreateNotificationDTO = {
          certificateId: certificate.id,
          recipientEmails: allRecipientEmails,
          subject: this.buildEmailSubject(certificate),
          expirationStatusAtTime: certificate.expirationStatus,
          result: isForceMode ? NotificationResult.FORCE : NotificationResult.SENT
        };

        await this.notificationRepository.save({
          id: notificationId,
          sentAt,
          ...notificationDTO,
          errorMessage: errorCount > 0 ? `${successCount}/${allRecipientEmails.length} enviados. Errores: ${overallErrorMessage}` : null
        });

        return {
          ...baseResult,
          success: true
        };
      } else {
        // Todos fallaron
        throw new Error(overallErrorMessage || 'Error al enviar todos los emails');
      }
    } catch (error) {
      // Construir mensaje de error detallado para auditoría
      const errorMessage = this.buildErrorMessage(error);

      const notificationDTO: CreateNotificationDTO = {
        certificateId: certificate.id,
        recipientEmails: allRecipientEmails.length > 0 ? allRecipientEmails : certificate.responsibleContacts.map(c => c.email),
        subject: this.buildEmailSubject(certificate),
        expirationStatusAtTime: certificate.expirationStatus,
        result: NotificationResult.ERROR,
        errorMessage
      };

      await this.notificationRepository.save({
        id: notificationId,
        sentAt,
        ...notificationDTO,
        errorMessage
      });

      return {
        ...baseResult,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Construye el asunto del email según el estado del certificado
   */
  private buildEmailSubject(certificate: Certificate): string {
    if (certificate.expirationStatus === ExpirationStatus.EXPIRED) {
      return `⚠️ URGENTE: Certificado ${certificate.fileName} EXPIRADO`;
    }

    // Calcular días hasta expiración
    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);
    
    return `⚠️ Alerta: Certificado ${certificate.fileName} expira en ${daysUntilExpiration} día(s)`;
  }

  /**
   * Calcula los días hasta la fecha de expiración
   */
  private calculateDaysUntilExpiration(expirationDate: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expirationDate);
    expDate.setHours(0, 0, 0, 0);
    
    const diffTime = expDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Construye un mensaje de error detallado para auditoría
   * Captura información específica de errores SMTP
   */
  private buildErrorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'Error desconocido al enviar notificación';
    }

    const errorObj = error as any;
    const parts: string[] = [];

    // Mensaje principal del error
    parts.push(error.message);

    // Información adicional de errores SMTP (nodemailer)
    if (errorObj.code) {
      parts.push(`[Code: ${errorObj.code}]`);
    }

    if (errorObj.responseCode) {
      parts.push(`[SMTP Code: ${errorObj.responseCode}]`);
    }

    if (errorObj.response) {
      parts.push(`[Response: ${errorObj.response}]`);
    }

    // Información de conexión si está disponible
    if (errorObj.host) {
      parts.push(`[Host: ${errorObj.host}]`);
    }

    if (errorObj.port) {
      parts.push(`[Port: ${errorObj.port}]`);
    }

    // Limitar longitud total del mensaje (máximo 500 caracteres)
    const fullMessage = parts.join(' ');
    return fullMessage.length > 500 ? fullMessage.slice(0, 497) + '...' : fullMessage;
  }
}
