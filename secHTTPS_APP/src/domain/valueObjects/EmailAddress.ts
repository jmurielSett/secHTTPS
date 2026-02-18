import { ErrorCode, ValidationError } from '../../types/errors';

/**
 * Value Object: EmailAddress
 *
 * Garantiza que cualquier dirección de correo en el dominio sea sintácticamente
 * válida y esté normalizada (trim + lowercase).
 *
 * Invariante: el valor almacenado siempre cumple EMAIL_REGEX.
 */
export class EmailAddress {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly value: string) {}

  /**
   * Crea un EmailAddress validado.
   * @throws ValidationError (INVALID_EMAIL_FORMAT) si el formato no es válido.
   */
  static create(email: string): EmailAddress {
    const normalized = (email ?? '').trim().toLowerCase();

    if (!normalized || !EmailAddress.EMAIL_REGEX.test(normalized)) {
      throw new ValidationError(
        ErrorCode.INVALID_EMAIL_FORMAT,
        `Formato de email inválido: "${email}"`
      );
    }

    return new EmailAddress(normalized);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
}
