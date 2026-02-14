import { Certificate } from '../../types/certificate';

/**
 * Supported languages for email notifications
 */
export enum SupportedLanguage {
  ES = 'es',
  EN = 'en',
  FR = 'fr',
  DE = 'de'
}

/**
 * Email template types
 */
export enum EmailTemplate {
  CERTIFICATE_CREATION = 'certificate_creation',
  CERTIFICATE_WARNING = 'certificate_warning',
  CERTIFICATE_EXPIRED = 'certificate_expired'
}

/**
 * Localized email content structure
 */
export interface LocalizedEmailContent {
  subject: string;
  htmlBody: string;
  textBody: string;
}

/**
 * Interfaz del servicio de localización
 * Define el contrato que debe cumplir cualquier implementación de localización
 * (Inversión de Dependencias - Clean Architecture)
 */
export interface ILocalizationService {
  /**
   * Obtiene el contenido del email localizado para un certificado
   * @param template Tipo de email a generar
   * @param certificate Datos del certificado
   * @param language Idioma del destinatario
   * @returns Contenido del email traducido
   */
  getEmailContent(
    template: EmailTemplate,
    certificate: Certificate,
    language: SupportedLanguage
  ): LocalizedEmailContent;

  /**
   * Verifica si un idioma está soportado
   * @param language Código de idioma (ej: 'es', 'en')
   * @returns true si el idioma está soportado
   */
  isSupportedLanguage(language: string): boolean;

  /**
   * Obtiene el idioma por defecto del sistema
   * @returns Idioma por defecto configurado
   */
  getDefaultLanguage(): SupportedLanguage;

  /**
   * Normaliza un código de idioma a SupportedLanguage
   * Si el idioma no está soportado, retorna el idioma por defecto
   * @param language Código de idioma
   * @returns SupportedLanguage normalizado
   */
  normalizeLanguage(language: string): SupportedLanguage;
}
