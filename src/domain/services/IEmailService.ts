/**
 * Interfaz del servicio de envío de emails
 * Define el contrato que debe cumplir cualquier implementación de envío de correos
 * (Inversión de Dependencias - Clean Architecture)
 */
export interface IEmailService {
  /**
   * Envía un email genérico a un destinatario
   * @param recipient Email del destinatario
   * @param subject Asunto del email
   * @param htmlContent Contenido HTML del email
   * @param textContent Contenido en texto plano (fallback)
   * @returns Promise que resuelve cuando el email ha sido enviado
   * @throws Error si falla el envío
   */
  sendEmail(
    recipient: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void>;

  /**
   * Verifica que la configuración SMTP es válida
   * @returns Promise<boolean> true si la configuración es válida
   */
  verifyConnection(): Promise<boolean>;
}
