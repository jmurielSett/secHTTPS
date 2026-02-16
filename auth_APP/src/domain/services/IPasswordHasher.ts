/**
 * Password Hasher Interface
 * Contract for password hashing and comparison operations
 */
export interface IPasswordHasher {
  /**
   * Hashes a plain-text password
   * @param password - Plain-text password
   * @returns Hashed password
   */
  hash(password: string): Promise<string>;

  /**
   * Compares a plain-text password with a hashed password
   * @param password - Plain-text password
   * @param hash - Hashed password
   * @returns true if passwords match, false otherwise
   */
  compare(password: string, hash: string): Promise<boolean>;
}
