import nodemailer, { Transporter } from 'nodemailer';
import { IEmailService } from '../../domain/services/IEmailService';
import { Certificate } from '../../types/certificate';
import { ExpirationStatus } from '../../types/shared';

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
   * Verifica que la conexión SMTP sea válida
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

  /**
   * Envía un email de alerta de expiración de certificado
   */
  async sendExpirationAlert(certificate: Certificate): Promise<void> {
    const subject = this.buildSubject(certificate);
    const htmlContent = this.buildHtmlContent(certificate);
    const textContent = this.buildTextContent(certificate);

    const mailOptions = {
      from: `"${this.systemName}" <${this.fromAddress}>`,
      to: certificate.responsibleEmails.join(', '),
      subject,
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado exitosamente: ${info.messageId}`);
    } catch (error) {
      console.error(`Error al enviar email para certificado ${certificate.id}:`, error);
      throw error;
    }
  }

  /**
   * Envía un email de notificación de certificado creado
   */
  async sendCertificateCreationNotification(certificate: Certificate): Promise<void> {
    const subject = `✅ Nuevo Certificado Registrado: ${certificate.fileName}`;
    const htmlContent = this.buildCreationHtmlContent(certificate);
    const textContent = this.buildCreationTextContent(certificate);

    const mailOptions = {
      from: `"${this.systemName}" <${this.fromAddress}>`,
      to: certificate.responsibleEmails.join(', '),
      subject,
      text: textContent,
      html: htmlContent
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email de creación enviado exitosamente: ${info.messageId}`);
    } catch (error) {
      console.error(`Error al enviar email de creación para certificado ${certificate.id}:`, error);
      throw error;
    }
  }

  /**
   * Construye el asunto del email
   */
  private buildSubject(certificate: Certificate): string {
    if (certificate.expirationStatus === ExpirationStatus.EXPIRED) {
      return `⚠️ URGENTE: Certificado ${certificate.fileName} EXPIRADO`;
    }

    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);
    return `⚠️ Alerta: Certificado ${certificate.fileName} expira en ${daysUntilExpiration} día(s)`;
  }

  /**
   * Construye el contenido HTML del email
   */
  private buildHtmlContent(certificate: Certificate): string {
    const isExpired = certificate.expirationStatus === ExpirationStatus.EXPIRED;
    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);
    
    const urgencyColor = isExpired ? '#d32f2f' : '#f57c00';
    const statusText = isExpired ? 'EXPIRADO' : `Expira en ${daysUntilExpiration} día(s)`;
    const icon = isExpired ? '🔴' : '⚠️';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerta de Certificado</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">${icon} Alerta de Certificado SSL/TLS</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Se ha detectado que el siguiente certificado requiere atención inmediata:
              </p>
              
              <table width="100%" cellpadding="10" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px;">
                <tr>
                  <td style="font-weight: bold; color: #555; width: 40%;">Estado:</td>
                  <td style="color: ${urgencyColor}; font-weight: bold; font-size: 18px;">${statusText}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Archivo:</td>
                  <td style="color: #333;">${certificate.fileName}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Servidor:</td>
                  <td style="color: #333;">${certificate.server}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Cliente:</td>
                  <td style="color: #333;">${certificate.client}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Fecha Expiración:</td>
                  <td style="color: #333;">${this.formatDate(certificate.expirationDate)}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Ruta:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.filePath}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Config:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.configPath}</td>
                </tr>
              </table>
              
              ${isExpired 
                ? `<div style="background-color: #fff3e0; border-left: 4px solid #f57c00; padding: 15px; margin-bottom: 20px;">
                     <p style="margin: 0; color: #d32f2f; font-weight: bold;">⚠️ ACCIÓN REQUERIDA URGENTE</p>
                     <p style="margin: 10px 0 0 0; color: #555;">
                       Este certificado ya ha expirado. Los servicios que dependen de él pueden estar fuera de servicio.
                       Por favor, renueve e instale el certificado inmediatamente.
                     </p>
                   </div>`
                : `<div style="background-color: #fff9c4; border-left: 4px solid #fbc02d; padding: 15px; margin-bottom: 20px;">
                     <p style="margin: 0; color: #f57c00; font-weight: bold;">⚠️ Acción Requerida</p>
                     <p style="margin: 10px 0 0 0; color: #555;">
                       Por favor, proceda a renovar este certificado antes de la fecha de expiración
                       para evitar interrupciones en el servicio.
                     </p>
                   </div>`
              }
              
              <p style="margin: 0; font-size: 14px; color: #777;">
                Este es un mensaje automático del sistema ${this.systemName}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${this.systemName} - Sistema de Monitoreo de Certificados SSL/TLS<br>
                Fecha: ${this.formatDateTime(new Date().toISOString())}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Construye el contenido en texto plano del email (fallback)
   */
  private buildTextContent(certificate: Certificate): string {
    const isExpired = certificate.expirationStatus === ExpirationStatus.EXPIRED;
    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);
    
    const statusText = isExpired 
      ? 'EXPIRADO' 
      : `Expira en ${daysUntilExpiration} día(s)`;

    return `
${this.systemName} - Alerta de Certificado SSL/TLS

ESTADO: ${statusText}

Detalles del Certificado:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archivo:          ${certificate.fileName}
Servidor:         ${certificate.server}
Cliente:          ${certificate.client}
Fecha Expiración: ${this.formatDate(certificate.expirationDate)}
Ruta:             ${certificate.filePath}
Config:           ${certificate.configPath}

${isExpired 
  ? `⚠️ ACCIÓN REQUERIDA URGENTE
Este certificado ya ha expirado. Los servicios que dependen de él pueden estar fuera de servicio.
Por favor, renueve e instale el certificado inmediatamente.`
  : `⚠️ Acción Requerida
Por favor, proceda a renovar este certificado antes de la fecha de expiración
para evitar interrupciones en el servicio.`
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este es un mensaje automático del sistema ${this.systemName}.
Fecha: ${this.formatDateTime(new Date().toISOString())}
    `.trim();
  }

  /**
   * Calcula los días hasta la expiración
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
   * Formatea una fecha en formato legible (DD/MM/YYYY)
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Formatea una fecha y hora en formato legible
   */
  private formatDateTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    const dateStr = this.formatDate(dateTimeString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${dateStr} ${hours}:${minutes}`;
  }

  /**
   * Construye el contenido HTML para email de creación de certificado
   */
  private buildCreationHtmlContent(certificate: Certificate): string {
    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Certificado Creado</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #4caf50; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">✅ Certificado SSL/TLS Registrado</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                Se ha registrado exitosamente un nuevo certificado en el sistema de monitoreo:
              </p>
              
              <table width="100%" cellpadding="10" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px;">
                <tr>
                  <td style="font-weight: bold; color: #555; width: 40%;">Archivo:</td>
                  <td style="color: #333;">${certificate.fileName}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Servidor:</td>
                  <td style="color: #333;">${certificate.server}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Cliente:</td>
                  <td style="color: #333;">${certificate.client}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Fecha Inicio:</td>
                  <td style="color: #333;">${this.formatDate(certificate.startDate)}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Fecha Expiración:</td>
                  <td style="color: #333;">${this.formatDate(certificate.expirationDate)}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Días de Validez:</td>
                  <td style="color: #333;">${daysUntilExpiration} días</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Ruta:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.filePath}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Config:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.configPath}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">Estado:</td>
                  <td style="color: #4caf50; font-weight: bold;">${certificate.status}</td>
                </tr>
              </table>
              
              <div style="background-color: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: #2e7d32; font-weight: bold;">ℹ️ Monitoreo Automático</p>
                <p style="margin: 10px 0 0 0; color: #555;">
                  Este certificado será monitoreado automáticamente. Recibirás notificaciones
                  cuando se acerque la fecha de expiración o cuando expire.
                </p>
              </div>
              
              <p style="margin: 0; font-size: 14px; color: #777;">
                Este es un mensaje automático del sistema ${this.systemName}.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${this.systemName} - Sistema de Monitoreo de Certificados SSL/TLS<br>
                Fecha: ${this.formatDateTime(new Date().toISOString())}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Construye el contenido en texto plano para email de creación (fallback)
   */
  private buildCreationTextContent(certificate: Certificate): string {
    const daysUntilExpiration = this.calculateDaysUntilExpiration(certificate.expirationDate);

    return `
${this.systemName} - Certificado SSL/TLS Registrado

✅ CERTIFICADO CREADO EXITOSAMENTE

Detalles del Certificado:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archivo:          ${certificate.fileName}
Servidor:         ${certificate.server}
Cliente:          ${certificate.client}
Fecha Inicio:     ${this.formatDate(certificate.startDate)}
Fecha Expiración: ${this.formatDate(certificate.expirationDate)}
Días de Validez:  ${daysUntilExpiration} días
Ruta:             ${certificate.filePath}
Config:           ${certificate.configPath}
Estado:           ${certificate.status}

ℹ️ Monitoreo Automático
Este certificado será monitoreado automáticamente. Recibirás notificaciones
cuando se acerque la fecha de expiración o cuando expire.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Este es un mensaje automático del sistema ${this.systemName}.
Fecha: ${this.formatDateTime(new Date().toISOString())}
    `.trim();
  }
}
