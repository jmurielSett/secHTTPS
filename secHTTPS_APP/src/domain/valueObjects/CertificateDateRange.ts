import { ErrorCode, ValidationError } from '../../types/errors';

/**
 * Value Object: CertificateDateRange
 *
 * Encapsula el rango de validez de un certificado SSL/TLS.
 * Garantiza que:
 *  - Ambas fechas sean válidas (parseable por Date).
 *  - La fecha de expiración sea estrictamente posterior a la fecha de inicio.
 *
 * Las fechas se almacenan internamente como objetos Date y se exponen
 * en formato ISO 8601 (string), consistente con el resto del dominio.
 */
export class CertificateDateRange {
  private constructor(
    private readonly start: Date,
    private readonly expiration: Date
  ) {}

  /**
   * Crea un CertificateDateRange validado.
   * @throws ValidationError (INVALID_DATE_RANGE) si las fechas no son válidas
   *         o si expiration no es posterior a start.
   */
  static create(startDate: string, expirationDate: string): CertificateDateRange {
    const start = new Date(startDate);
    const expiration = new Date(expirationDate);

    if (Number.isNaN(start.getTime())) {
      throw new ValidationError(
        ErrorCode.INVALID_DATE_RANGE,
        `Fecha de inicio inválida: "${startDate}"`
      );
    }

    if (Number.isNaN(expiration.getTime())) {
      throw new ValidationError(
        ErrorCode.INVALID_DATE_RANGE,
        `Fecha de expiración inválida: "${expirationDate}"`
      );
    }

    if (expiration <= start) {
      throw new ValidationError(
        ErrorCode.INVALID_DATE_RANGE,
        'La fecha de expiración debe ser posterior a la fecha de inicio'
      );
    }

    return new CertificateDateRange(start, expiration);
  }

  getStartDate(): string {
    return this.start.toISOString();
  }

  getExpirationDate(): string {
    return this.expiration.toISOString();
  }

  /** Número de días hasta la expiración desde ahora (negativo si ya expiró). */
  daysUntilExpiration(): number {
    const now = new Date();
    return Math.floor((this.expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  equals(other: CertificateDateRange): boolean {
    return (
      this.start.getTime() === other.start.getTime() &&
      this.expiration.getTime() === other.expiration.getTime()
    );
  }
}
