import { describe, expect, it } from 'vitest';
import { CertificateDateRange } from '../../../../src/domain/valueObjects/CertificateDateRange';
import { ErrorCode, ValidationError } from '../../../../src/types/errors';

/**
 * Tests para el Value Object CertificateDateRange.
 * Verifica que el rango de fechas sea coherente y que se exponga
 * correctamente en formato ISO 8601.
 */
describe('CertificateDateRange', () => {
  // ─── creación válida ─────────────────────────────────────────────────────

  it('debería crear un CertificateDateRange con fechas válidas', () => {
    const range = CertificateDateRange.create('2026-01-01', '2027-01-01');
    expect(range.getStartDate()).toContain('2026-01-01');
    expect(range.getExpirationDate()).toContain('2027-01-01');
  });

  it('getStartDate() y getExpirationDate() deberían devolver ISO 8601', () => {
    const range = CertificateDateRange.create('2026-03-01', '2028-03-01');
    expect(range.getStartDate()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(range.getExpirationDate()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('daysUntilExpiration() debería devolver negativo para una fecha pasada', () => {
    const range = CertificateDateRange.create('2020-01-01', '2021-01-01');
    expect(range.daysUntilExpiration()).toBeLessThan(0);
  });

  it('daysUntilExpiration() debería devolver positivo para una fecha futura', () => {
    const range = CertificateDateRange.create('2026-01-01', '2099-12-31');
    expect(range.daysUntilExpiration()).toBeGreaterThan(0);
  });

  it('equals() debería devolver true para el mismo rango', () => {
    const a = CertificateDateRange.create('2026-01-01', '2027-01-01');
    const b = CertificateDateRange.create('2026-01-01', '2027-01-01');
    expect(a.equals(b)).toBe(true);
  });

  it('equals() debería devolver false para rangos distintos', () => {
    const a = CertificateDateRange.create('2026-01-01', '2027-01-01');
    const b = CertificateDateRange.create('2026-01-01', '2028-01-01');
    expect(a.equals(b)).toBe(false);
  });

  // ─── validación — expiration <= start ────────────────────────────────────

  it('debería lanzar ValidationError si expiration es igual a start', () => {
    expect(() => CertificateDateRange.create('2026-01-01', '2026-01-01')).toThrow(ValidationError);
    expect(() => CertificateDateRange.create('2026-01-01', '2026-01-01')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DATE_RANGE })
    );
  });

  it('debería lanzar ValidationError si expiration es anterior a start', () => {
    expect(() => CertificateDateRange.create('2026-06-01', '2026-01-01')).toThrow(ValidationError);
    expect(() => CertificateDateRange.create('2026-06-01', '2026-01-01')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DATE_RANGE })
    );
  });

  // ─── validación — fechas inválidas ────────────────────────────────────────

  it('debería lanzar ValidationError para startDate inválida', () => {
    expect(() => CertificateDateRange.create('no-es-fecha', '2027-01-01')).toThrow(ValidationError);
    expect(() => CertificateDateRange.create('no-es-fecha', '2027-01-01')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DATE_RANGE })
    );
  });

  it('debería lanzar ValidationError para expirationDate inválida', () => {
    expect(() => CertificateDateRange.create('2026-01-01', 'no-es-fecha')).toThrow(ValidationError);
    expect(() => CertificateDateRange.create('2026-01-01', 'no-es-fecha')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DATE_RANGE })
    );
  });

  it('debería lanzar ValidationError para fechas vacías', () => {
    expect(() => CertificateDateRange.create('', '')).toThrow(
      expect.objectContaining({ code: ErrorCode.INVALID_DATE_RANGE })
    );
  });
});
