/**
 * Token Value Object
 * Ensures token validity and immutability
 */
export class Token {
  private static readonly MIN_LENGTH = 10;

  private constructor(private readonly value: string) {}

  /**
   * Creates a Token instance from a string
   * @throws Error if token is invalid
   */
  static create(token: string): Token {
    const trimmedToken = token.trim();

    if (!trimmedToken) {
      throw new Error('Token cannot be empty');
    }

    if (trimmedToken.length < Token.MIN_LENGTH) {
      throw new Error('Token is too short');
    }

    return new Token(trimmedToken);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Token): boolean {
    return this.value === other.value;
  }

  toString(): string {
    // Show only first 10 chars for security
    return `${this.value.substring(0, 10)}...`;
  }

  /**
   * Returns full token value (use with caution)
   */
  toFullString(): string {
    return this.value;
  }
}
