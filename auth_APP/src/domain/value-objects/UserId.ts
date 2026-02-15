import { randomUUID } from 'node:crypto';

/**
 * UserId Value Object
 * Ensures UUID validity and immutability
 */
export class UserId {
  private static readonly UUID_REGEX = 
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  private constructor(private readonly value: string) {}

  /**
   * Creates a UserId from an existing UUID string
   * @throws Error if UUID format is invalid
   */
  static create(id: string): UserId {
    if (!UserId.isValid(id)) {
      throw new Error('Invalid UUID format');
    }
    return new UserId(id);
  }

  /**
   * Generates a new random UserId (UUID v4)
   */
  static generate(): UserId {
    return new UserId(randomUUID());
  }

  private static isValid(id: string): boolean {
    return UserId.UUID_REGEX.test(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
