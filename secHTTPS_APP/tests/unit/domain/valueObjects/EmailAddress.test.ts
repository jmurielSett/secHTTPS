import { describe, expect, it } from 'vitest';
import { EmailAddress } from '../../../../src/domain/valueObjects/EmailAddress';
import { ErrorCode, ValidationError } from '../../../../src/types/errors';

/**
 * Tests para el Value Object EmailAddress.
 * Verifica el invariante: todo EmailAddress creado con éxito tiene formato válido.
 */
describe('EmailAddress', () => {
  // ─── creación válida ─────────────────────────────────────────────────────

  it('debería crear un EmailAddress con un email bien formado', () => {
    const email = EmailAddress.create('user@example.com');
    expect(email.getValue()).toBe('user@example.com');
  });

  it('debería normalizar el email a minúsculas', () => {
    const email = EmailAddress.create('Admin@TEST.COM');
    expect(email.getValue()).toBe('admin@test.com');
  });

  it('debería recortar espacios en blanco del email', () => {
    const email = EmailAddress.create('  user@example.com  ');
    expect(email.getValue()).toBe('user@example.com');
  });

  it('debería aceptar emails con subdominio', () => {
    const email = EmailAddress.create('ops@mail.empresa.es');
    expect(email.getValue()).toBe('ops@mail.empresa.es');
  });

  it('debería aceptar emails con + en la parte local', () => {
    const email = EmailAddress.create('user+tag@example.com');
    expect(email.getValue()).toBe('user+tag@example.com');
  });

  // ─── toString / equals ───────────────────────────────────────────────────

  it('toString() debería devolver el valor del email', () => {
    const email = EmailAddress.create('admin@test.com');
    expect(email.toString()).toBe('admin@test.com');
  });

  it('equals() debería devolver true para el mismo email normalizado', () => {
    const a = EmailAddress.create('admin@test.com');
    const b = EmailAddress.create('ADMIN@TEST.COM');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() debería devolver false para emails distintos', () => {
    const a = EmailAddress.create('admin@test.com');
    const b = EmailAddress.create('user@test.com');
    expect(a.equals(b)).toBe(false);
  });

  // ─── validación — casos inválidos ────────────────────────────────────────

  it('debería lanzar ValidationError para un email vacío', () => {
    expect(() => EmailAddress.create('')).toThrow(ValidationError);
    expect(() => EmailAddress.create('')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_EMAIL_FORMAT })
    );
  });

  it('debería lanzar ValidationError para un email sin @', () => {
    expect(() => EmailAddress.create('noatsign.com')).toThrow(ValidationError);
    expect(() => EmailAddress.create('noatsign.com')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_EMAIL_FORMAT })
    );
  });

  it('debería lanzar ValidationError para un email sin dominio', () => {
    expect(() => EmailAddress.create('user@')).toThrow(ValidationError);
    expect(() => EmailAddress.create('user@')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_EMAIL_FORMAT })
    );
  });

  it('debería lanzar ValidationError para un email sin extensión de dominio', () => {
    expect(() => EmailAddress.create('user@domain')).toThrow(ValidationError);
    expect(() => EmailAddress.create('user@domain')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_EMAIL_FORMAT })
    );
  });

  it('debería lanzar ValidationError para solo espacios', () => {
    expect(() => EmailAddress.create('   ')).toThrow(ValidationError);
    expect(() => EmailAddress.create('   ')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_EMAIL_FORMAT })
    );
  });
});
