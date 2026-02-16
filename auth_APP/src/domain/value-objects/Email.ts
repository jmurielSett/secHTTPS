/**
 * Email Value Object
 * Ensures email format validity and immutability
 */
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(private readonly value: string) {}

  /**
   * Creates an Email instance from a string
   * @throws Error if email format is invalid
   */
  static create(email: string): Email {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      throw new Error('Email cannot be empty');
    }

    if (trimmedEmail.length > 255) {
      throw new Error('Email is too long (max 255 characters)');
    }

    if (!Email.isValid(trimmedEmail)) {
      throw new Error('Invalid email format');
    }

    return new Email(trimmedEmail.toLowerCase());
  }

  private static isValid(email: string): boolean {
    return Email.EMAIL_REGEX.test(email);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
