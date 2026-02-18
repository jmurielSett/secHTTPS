import { ErrorCode, ValidationError } from '../../types/errors';
import { SupportedLanguage } from '../services/ILocalizationService';

/**
 * Value Object: LanguageCode
 *
 * Garantiza que el código de idioma almacenado sea uno de los idiomas
 * soportados por la aplicación (SupportedLanguage).
 *
 * Invariante: getValue() siempre devuelve un miembro de SupportedLanguage.
 */
export class LanguageCode {
  private static readonly VALID = new Set<string>(Object.values(SupportedLanguage));

  private constructor(private readonly value: SupportedLanguage) {}

  /**
   * Crea un LanguageCode validado.
   * @throws ValidationError (INVALID_LANGUAGE_CODE) si el código no está soportado.
   */
  static create(code: string): LanguageCode {
    const normalized = (code ?? '').trim().toLowerCase();

    if (!normalized || !LanguageCode.VALID.has(normalized)) {
      const valid = [...LanguageCode.VALID].join(', ');
      throw new ValidationError(
        ErrorCode.INVALID_LANGUAGE_CODE,
        `Idioma no soportado: "${code}". Idiomas válidos: ${valid}`
      );
    }

    return new LanguageCode(normalized as SupportedLanguage);
  }

  getValue(): SupportedLanguage {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: LanguageCode): boolean {
    return this.value === other.value;
  }
}
