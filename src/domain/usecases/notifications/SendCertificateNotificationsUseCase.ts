import { randomUUID } from 'node:crypto';
import { ICertificateRepository } from '../../../infrastructure/persistence/CertificateRepository';
import { INotificationRepository } from '../../../infrastructure/persistence/NotificationRepository';
import { Certificate, CertificateStatus } from '../../../types/certificate';
import { CreateNotificationDTO, NotificationResult, NotificationResultDetail, NotificationSummary } from '../../../types/notification';
import { ExpirationStatus, NOTIFICATION_FREQUENCY } from '../../../types/shared';
import { IEmailService } from '../../services/IEmailService';

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
    private readonly emailService: IEmailService
  ) {}

  /**
   * Ejecuta el proceso de notificaciones
   * @returns Resumen con estadísticas y resultados detallados
   */
  async execute(): Promise<NotificationSummary> {
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
    const certsToNotify = await this.filterCertificatesNeedingNotification(allCertificates);

    // 3. Enviar notificaciones
    for (const cert of certsToNotify) {
      const result = await this.sendNotificationForCertificate(cert);
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
   */
  private async shouldSendNotification(certificate: Certificate): Promise<boolean> {
    const lastNotification = await this.notificationRepository.findLastByCertificateId(
      certificate.id
    );

    // Si nunca se ha enviado notificación, enviar
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
    certificate: Certificate
  ): Promise<NotificationResultDetail> {
    const notificationId = randomUUID();
    const sentAt = new Date().toISOString();

    const baseResult: NotificationResultDetail = {
      certificateId: certificate.id,
      certificateFileName: certificate.fileName,
      success: false
    };

    try {
      // Intentar enviar el email
      await this.emailService.sendExpirationAlert(certificate);

      // Si tuvo éxito, guardar notificación exitosa
      const notificationDTO: CreateNotificationDTO = {
        certificateId: certificate.id,
        recipientEmails: certificate.responsibleEmails,
        subject: this.buildEmailSubject(certificate),
        expirationStatusAtTime: certificate.expirationStatus,
        result: NotificationResult.SENT
      };

      await this.notificationRepository.save({
        id: notificationId,
        sentAt,
        ...notificationDTO,
        errorMessage: null
      });

      return {
        ...baseResult,
        success: true
      };
    } catch (error) {
      // Construir mensaje de error detallado para auditoría
      const errorMessage = this.buildErrorMessage(error);

      // Guardar notificación fallida
      const notificationDTO: CreateNotificationDTO = {
        certificateId: certificate.id,
        recipientEmails: certificate.responsibleEmails,
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
