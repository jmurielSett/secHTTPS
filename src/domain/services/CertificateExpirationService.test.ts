import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificateExpirationService } from './CertificateExpirationService';

/**
 * Tests para la lógica de cálculo del estado de expiración de certificados
 * Según especificación en 001_ApiDesign.md:
 * - NORMAL: expirationDate - currentDate > 7 días
 * - WARNING: expirationDate - currentDate <= 7 días y expirationDate >= currentDate
 * - EXPIRED: currentDate > expirationDate
 */

describe('CertificateExpirationService', () => {
  describe('calculateExpirationStatus', () => {
    beforeEach(() => {
      // Mock de la fecha actual: 2026-02-08
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-02-08T00:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debería retornar NORMAL cuando faltan más de 7 días para expirar', () => {
      const expirationDate = '2026-02-20'; // 12 días después
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('NORMAL');
    });

    it('debería retornar WARNING cuando faltan exactamente 7 días para expirar', () => {
      const expirationDate = '2026-02-15'; // Exactamente 7 días
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('WARNING');
    });

    it('debería retornar WARNING cuando falta 1 día para expirar', () => {
      const expirationDate = '2026-02-09'; // 1 día después
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('WARNING');
    });

    it('debería retornar WARNING cuando expira el mismo día', () => {
      const expirationDate = '2026-02-08'; // Mismo día
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('WARNING');
    });

    it('debería retornar EXPIRED cuando la fecha ya pasó', () => {
      const expirationDate = '2026-02-07'; // 1 día antes
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('EXPIRED');
    });

    it('debería retornar EXPIRED cuando la fecha pasó hace mucho tiempo', () => {
      const expirationDate = '2025-01-01'; // Hace más de un año
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('EXPIRED');
    });

    it('debería retornar NORMAL cuando faltan exactamente 8 días', () => {
      const expirationDate = '2026-02-16'; // 8 días después
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('NORMAL');
    });

    it('debería manejar correctamente el cambio de mes', () => {
      vi.setSystemTime(new Date('2026-01-28T00:00:00Z'));
      const expirationDate = '2026-02-03'; // 6 días después, pero cambia de mes
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('WARNING');
    });

    it('debería manejar correctamente el cambio de año', () => {
      vi.setSystemTime(new Date('2025-12-29T00:00:00Z'));
      const expirationDate = '2026-01-03'; // 5 días después, pero cambia de año
      const result = CertificateExpirationService.calculateExpirationStatus(expirationDate);
      expect(result).toBe('WARNING');
    });
  });
});
