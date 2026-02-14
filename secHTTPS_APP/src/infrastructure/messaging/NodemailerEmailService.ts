import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService } from '../../domain/services/IEmailService';

/**
 * Implementación del servicio de envío de emails usando Nodemailer
 * Adaptador que conecta el dominio con la librería técnica nodemailer
 */
export class NodemailerEmailService implements IEmailService {
  private readonly transporter: Transporter;
  private readonly fromAddress: string;
  private readonly systemName: string;

  constructor() {
    // Validar configuración necesaria
    this.validateConfig();

    this.fromAddress = process.env.SMTP_FROM || 'noreply@sechttps.local';
    this.systemName = process.env.SYSTEM_NAME || 'SecHTTPS Monitor';

    // Configurar transporter con configuración SMTP
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST!,
      port: Number.parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true para puerto 465, false para otros
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASSWORD!
      },
      // Opciones adicionales
      connectionTimeout: 10000, // 10 segundos
      greetingTimeout: 10000,
      socketTimeout: 10000
    });
  }

  /**
   * Valida que todas las variables de entorno necesarias estén configuradas
   * @throws Error si falta alguna configuración crítica
   */
  private validateConfig(): void {
    const requiredVars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'];
    const missing = requiredVars.filter(varName => !process.env[varName]);

    if (missing.length > 0) {
      throw new Error(
        `Configuración SMTP incompleta. Variables faltantes: ${missing.join(', ')}`
      );
    }
  }

  /**
   * Envía un email genérico a un destinatario
   */
  async sendEmail(
    recipient: string,
    subject: string,
    htmlContent: string,
    textContent: string
  ): Promise<void> {
    const mailOptions = {
      from: `"${this.systemName}" <${this.fromAddress}>`,
      to: recipient,
      subject,
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email enviado exitosamente a ${recipient}: ${info.messageId}`);
    } catch (error) {
      console.error(`❌ Error al enviar email a ${recipient}:`, error);
      throw error;
    }
  }

  /**
   * Verifica que la conexión SMTP es válida
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Error al verificar conexión SMTP:', error);
      return false;
    }
  }
}
