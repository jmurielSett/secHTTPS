import { Certificate } from '../../types/certificate';

/**
 * Interfaz del servicio de envío de emails
 * Define el contrato que debe cumplir cualquier implementación de envío de correos
 * (Inversión de Dependencias - Clean Architecture)
 */
export interface IEmailService {
  /**
   * Envía un email de alerta de expiración de certificado
   * @param certificate Certificado que expira o ya expiró
   * @returns Promise que resuelve cuando el email ha sido enviado
   * @throws Error si falla el envío
   */
  sendExpirationAlert(certificate: Certificate): Promise<void>;

  /**
   * Envía un email de notificación de certificado creado
   * @param certificate Certificado recién creado
   * @returns Promise que resuelve cuando el email ha sido enviado
   * @throws Error si falla el envío
   */
  sendCertificateCreationNotification(certificate: Certificate): Promise<void>;

  /**
   * Verifica que la configuración SMTP es válida
   * @returns Promise<boolean> true si la configuración es válida
   */
  verifyConnection(): Promise<boolean>;
}
