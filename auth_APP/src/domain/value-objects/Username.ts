/**
 * Username Value Object
 * Ensures username validity and immutability
 */
export class Username {
  private static readonly MIN_LENGTH = 3;
  private static readonly MAX_LENGTH = 50;
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;

  private constructor(private readonly value: string) {}

  /**
   * Creates a Username instance from a string
   * @throws Error if username is invalid
   */
  static create(username: string): Username {
    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      throw new Error('Username cannot be empty');
    }

    if (trimmedUsername.length < Username.MIN_LENGTH) {
      throw new Error(`Username must be at least ${Username.MIN_LENGTH} characters`);
    }

    if (trimmedUsername.length > Username.MAX_LENGTH) {
      throw new Error(`Username cannot exceed ${Username.MAX_LENGTH} characters`);
    }

    if (!Username.isValid(trimmedUsername)) {
      throw new Error('Username can only contain letters, numbers, underscores and hyphens');
    }

    return new Username(trimmedUsername);
  }

  private static isValid(username: string): boolean {
    return Username.USERNAME_REGEX.test(username);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Username): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
