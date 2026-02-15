/**
 * Password Value Object
 * Ensures password strength and immutability
 */
export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly MAX_LENGTH = 100;

  private constructor(private readonly value: string) {}

  /**
   * Creates a Password instance from a string
   * @throws Error if password doesn't meet requirements
   */
  static create(password: string): Password {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters`);
    }

    if (password.length > Password.MAX_LENGTH) {
      throw new Error(`Password cannot exceed ${Password.MAX_LENGTH} characters`);
    }

    if (!Password.hasMinimumStrength(password)) {
      throw new Error(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      );
    }

    return new Password(password);
  }

  private static hasMinimumStrength(password: string): boolean {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return hasUppercase && hasLowercase && hasNumber;
  }

  getValue(): string {
    return this.value;
  }

  /**
   * Note: Passwords should NOT be compared by value
   * Use PasswordHasher to compare hashed passwords
   */
  toString(): string {
    return '********'; // Never expose password value
  }
}
