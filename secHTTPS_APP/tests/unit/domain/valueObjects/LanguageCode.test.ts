import { describe, expect, it } from 'vitest';
import { SupportedLanguage } from '../../../../src/domain/services/ILocalizationService';
import { LanguageCode } from '../../../../src/domain/valueObjects/LanguageCode';
import { ErrorCode, ValidationError } from '../../../../src/types/errors';

/**
 * Tests para el Value Object LanguageCode.
 * Verifica el invariante: todo LanguageCode creado con éxito pertenece a SupportedLanguage.
 */
describe('LanguageCode', () => {
  // ─── creación válida ─────────────────────────────────────────────────────

  it('debería crear LanguageCode para "es"', () => {
    const lang = LanguageCode.create('es');
    expect(lang.getValue()).toBe(SupportedLanguage.ES);
  });

  it('debería crear LanguageCode para "en"', () => {
    const lang = LanguageCode.create('en');
    expect(lang.getValue()).toBe(SupportedLanguage.EN);
  });

  it('debería crear LanguageCode para "fr"', () => {
    const lang = LanguageCode.create('fr');
    expect(lang.getValue()).toBe(SupportedLanguage.FR);
  });

  it('debería crear LanguageCode para "de"', () => {
    const lang = LanguageCode.create('de');
    expect(lang.getValue()).toBe(SupportedLanguage.DE);
  });

  it('debería normalizar a minúsculas ("ES" → "es")', () => {
    const lang = LanguageCode.create('ES');
    expect(lang.getValue()).toBe(SupportedLanguage.ES);
  });

  it('debería recortar espacios en blanco', () => {
    const lang = LanguageCode.create('  en  ');
    expect(lang.getValue()).toBe(SupportedLanguage.EN);
  });

  // ─── toString / equals ───────────────────────────────────────────────────

  it('toString() debería devolver el código de idioma', () => {
    const lang = LanguageCode.create('es');
    expect(lang.toString()).toBe('es');
  });

  it('equals() debería devolver true para el mismo idioma', () => {
    const a = LanguageCode.create('es');
    const b = LanguageCode.create('ES');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() debería devolver false para idiomas distintos', () => {
    const a = LanguageCode.create('es');
    const b = LanguageCode.create('en');
    expect(a.equals(b)).toBe(false);
  });

  // ─── validación — casos inválidos ────────────────────────────────────────

  it('debería lanzar ValidationError para un código de idioma vacío', () => {
    expect(() => LanguageCode.create('')).toThrow(ValidationError);
    expect(() => LanguageCode.create('')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_LANGUAGE_CODE })
    );
  });

  it('debería lanzar ValidationError para un idioma no soportado', () => {
    expect(() => LanguageCode.create('pt')).toThrow(ValidationError);
    expect(() => LanguageCode.create('pt')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_LANGUAGE_CODE })
    );
  });

  it('debería lanzar ValidationError para un código inventado', () => {
    expect(() => LanguageCode.create('zz')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_LANGUAGE_CODE })
    );
  });
});
