/**
 * AuthProvider Value Object
 * Represents the authentication provider used for a login session
 * 
 * Domain-Driven Design: Value Object
 * - Immutable
 * - Self-validating
 * - Equality based on value
 * 
 * Values:
 * - 'DATABASE' for database authentication
 * - LDAP provider name (e.g., 'LDAP_SETTING_1', configured in LDAP_SERVERS)
 * - Any other custom provider identifier
 */

export const AUTH_PROVIDER_DATABASE = 'DATABASE';

export enum AuthProviderType {
  LDAP = 'LDAP',
  DATABASE = 'DATABASE'
}

export class AuthProvider {
  private readonly _value: string;

  private constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new Error('Authentication provider cannot be empty');
    }
    this._value = value.trim();
  }

  /**
   * Factory method: Create from string
   * Accepts any non-empty string (DATABASE, LDAP provider name, etc.)
   */
  static fromString(value: string): AuthProvider {
    return new AuthProvider(value);
  }

  /**
   * Factory method: Create DATABASE provider
   */
  static database(): AuthProvider {
    return new AuthProvider(AUTH_PROVIDER_DATABASE);
  }

  /**
   * Get the string value
   */
  get value(): string {
    return this._value;
  }

  /**
   * Check if this is LDAP provider (anything that is NOT 'DATABASE')
   */
  isLdap(): boolean {
    return this._value !== AUTH_PROVIDER_DATABASE;
  }

  /**
   * Check if this is DATABASE provider
   */
  isDatabase(): boolean {
    return this._value === AUTH_PROVIDER_DATABASE;
  }

  /**
   * Equality comparison
   */
  equals(other: AuthProvider | null | undefined): boolean {
    if (!other) return false;
    return this._value === other._value;
  }

  /**
   * String representation
   */
  toString(): string {
    return this._value;
  }

  /**
   * JSON serialization
   */
  toJSON(): string {
    return this._value;
  }
}
