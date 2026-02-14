import * as fs from 'node:fs';
import * as path from 'node:path';
import {
    EmailTemplate,
    ILocalizationService,
    LocalizedEmailContent,
    SupportedLanguage
} from '../../domain/services/ILocalizationService';
import { Certificate } from '../../types/certificate';

/**
 * Implementación del servicio de localización
 * Carga templates JSON y genera contenido de emails localizados
 */
export class LocalizationService implements ILocalizationService {
  private readonly templates: Map<string, any> = new Map();
  private readonly defaultLanguage: SupportedLanguage = SupportedLanguage.ES;
  private readonly systemName: string;

  constructor() {
    this.systemName = process.env.SYSTEM_NAME || 'SecHTTPS Monitor';
    this.loadTemplates();
  }

  getEmailContent(
    template: EmailTemplate,
    certificate: Certificate,
    language: SupportedLanguage
  ): LocalizedEmailContent {
    const normalizedLang = this.normalizeLanguage(language);
    const templateData = this.getTemplate(template, normalizedLang);

    if (!templateData) {
      throw new Error(`Template not found: ${template} for language: ${normalizedLang}`);
    }

    const subject = this.interpolate(templateData.subject, certificate);
    const htmlBody = this.buildHtml(templateData, certificate, template);
    const textBody = this.buildText(templateData, certificate, template);

    return { subject, htmlBody, textBody };
  }

  isSupportedLanguage(language: string): boolean {
    return Object.values(SupportedLanguage).includes(language as SupportedLanguage);
  }

  getDefaultLanguage(): SupportedLanguage {
    return this.defaultLanguage;
  }

  normalizeLanguage(language: string): SupportedLanguage {
    const lang = language.toLowerCase();
    if (this.isSupportedLanguage(lang)) {
      return lang as SupportedLanguage;
    }
    return this.defaultLanguage;
  }

  /**
   * Carga todos los templates JSON al inicializar
   */
  private loadTemplates(): void {
    const templatesDir = path.join(__dirname, 'templates');
    const languages = Object.values(SupportedLanguage);
    const templateTypes = Object.values(EmailTemplate);

    for (const lang of languages) {
      for (const templateType of templateTypes) {
        try {
          const templatePath = path.join(templatesDir, lang, `${templateType}.json`);
          if (fs.existsSync(templatePath)) {
            const content = fs.readFileSync(templatePath, 'utf-8');
            const data = JSON.parse(content);
            const key = `${lang}:${templateType}`;
            this.templates.set(key, data);
          }
        } catch (error) {
          console.warn(`Failed to load template: ${lang}/${templateType}`, error);
        }
      }
    }

    console.log(`✅ Loaded ${this.templates.size} localization templates`);
  }

  /**
   * Obtiene un template cargado
   */
  private getTemplate(template: EmailTemplate, language: SupportedLanguage): any {
    const key = `${language}:${template}`;
    return this.templates.get(key) || this.templates.get(`${this.defaultLanguage}:${template}`);
  }

  /**
   * Reemplaza variables {{variable}} con valores reales
   */
  private interpolate(text: string, certificate: Certificate): string {
    return text
      .replaceAll('{{fileName}}', certificate.fileName)
      .replaceAll('{{server}}', certificate.server)
      .replaceAll('{{client}}', certificate.client)
      .replaceAll('{{days}}', this.calculateDaysUntilExpiration(certificate.expirationDate).toString());
  }

  /**
   * Construye el contenido HTML del email
   */
  private buildHtml(templateData: any, certificate: Certificate, template: EmailTemplate): string {
    const isCreation = template === EmailTemplate.CERTIFICATE_CREATION;
    const isExpired = template === EmailTemplate.CERTIFICATE_EXPIRED;
    const isWarning = template === EmailTemplate.CERTIFICATE_WARNING;

    // Determinar color e icono según el tipo de email
    let color: string;
    let icon: string;
    if (isCreation) {
      color = '#4caf50';
      icon = '✅';
    } else if (isExpired) {
      color = '#d32f2f';
      icon = '🔴';
    } else {
      color = '#f57c00';
      icon = '⚠️';
    }

    let statusText = '';
    if (isCreation) {
      statusText = templateData.greeting;
    } else if (isExpired) {
      statusText = templateData.statusText;
    } else if (isWarning) {
      const days = this.calculateDaysUntilExpiration(certificate.expirationDate);
      statusText = templateData.daysUntilExpiration.replace('{{days}}', days.toString());
    }
    
    // Determinar color de fondo para sección de acción
    const actionBgColor = isExpired ? '#fff3e0' : '#fff9c4';

    return `
<!DOCTYPE html>
<html lang="${templateData.lang || 'es'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.interpolate(templateData.subject, certificate)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${color}; color: #ffffff; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 28px;">${icon} ${templateData.greeting}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333;">
                ${templateData.description}
              </p>
              
              <table width="100%" cellpadding="10" style="background-color: #f9f9f9; border-radius: 4px; margin-bottom: 20px;">
                ${isCreation ? '' : `
                <tr>
                  <td style="font-weight: bold; color: #555; width: 40%;">${templateData.labels.fileName}:</td>
                  <td style="color: ${color}; font-weight: bold; font-size: 18px;">${statusText}</td>
                </tr>`}
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.fileName}:</td>
                  <td style="color: #333;">${certificate.fileName}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.server}:</td>
                  <td style="color: #333;">${certificate.server}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.client}:</td>
                  <td style="color: #333;">${certificate.client}</td>
                </tr>
                ${isCreation ? `
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.startDate}:</td>
                  <td style="color: #333;">${this.formatDate(certificate.startDate)}</td>
                </tr>` : ''}
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.expirationDate}:</td>
                  <td style="color: #333;">${this.formatDate(certificate.expirationDate)}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.filePath}:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.filePath}</td>
                </tr>
                <tr>
                  <td style="font-weight: bold; color: #555;">${templateData.labels.configPath}:</td>
                  <td style="color: #333; word-break: break-all;">${certificate.configPath}</td>
                </tr>
              </table>
              
              ${templateData.action ? `
              <div style="background-color: ${actionBgColor}; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; color: ${color}; font-weight: bold;">${templateData.action.title}</p>
                <p style="margin: 10px 0 0 0; color: #555;">
                  ${templateData.action.message}
                </p>
              </div>` : ''}
              
              <p style="margin: 0; font-size: 14px; color: #777;">
                ${templateData.footer}
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                ${this.systemName}<br>
                ${new Date().toISOString().split('T')[0]}
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
   * Construye el contenido en texto plano (fallback)
   */
  private buildText(templateData: any, certificate: Certificate, template: EmailTemplate): string {
    const isCreation = template === EmailTemplate.CERTIFICATE_CREATION;
    const isExpired = template === EmailTemplate.CERTIFICATE_EXPIRED;

    let statusLine = '';
    if (isExpired) {
      statusLine = `Estado: ${templateData.statusText}`;
    } else if (template === EmailTemplate.CERTIFICATE_WARNING) {
      const days = this.calculateDaysUntilExpiration(certificate.expirationDate);
      statusLine = `Estado: ${templateData.daysUntilExpiration.replace('{{days}}', days.toString())}`;
    }

    return `
${this.systemName}
${templateData.greeting}

${templateData.description}

${statusLine ? statusLine + '\n' : ''}
${templateData.labels.fileName}: ${certificate.fileName}
${templateData.labels.server}: ${certificate.server}
${templateData.labels.client}: ${certificate.client}
${isCreation ? `${templateData.labels.startDate}: ${this.formatDate(certificate.startDate)}` : ''}
${templateData.labels.expirationDate}: ${this.formatDate(certificate.expirationDate)}
${templateData.labels.filePath}: ${certificate.filePath}
${templateData.labels.configPath}: ${certificate.configPath}

${templateData.action ? `
${templateData.action.title}
${templateData.action.message}
` : ''}

${templateData.footer}
    `.trim();
  }

  /**
   * Formatea fecha para mostrar
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Calcula días hasta la expiración
   */
  private calculateDaysUntilExpiration(expirationDate: string): number {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(diffDays, 0);
  }
}
