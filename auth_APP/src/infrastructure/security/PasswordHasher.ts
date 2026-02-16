import bcrypt from 'bcrypt';
import { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import { logError } from '../../utils/logger';

/**
 * Password Hasher Service
 * Handles password hashing and comparison using bcrypt
 */
export class PasswordHasher implements IPasswordHasher {
  private readonly saltRounds: number;

  constructor(saltRounds: number = 10) {
    if (saltRounds < 10) {
      throw new Error('Salt rounds must be at least 10 for security');
    }
    this.saltRounds = saltRounds;
  }

  /**
   * Hashes a plain-text password
   * @param password - Plain-text password
   * @returns Hashed password (bcrypt format)
   */
  async hash(password: string): Promise<string> {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    try {
      return await bcrypt.hash(password, this.saltRounds);
    } catch (error) {
      throw new Error(`Failed to hash password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Compares a plain-text password with a hashed password
   * @param password - Plain-text password
   * @param hash - Hashed password from database
   * @returns true if passwords match, false otherwise
   */
  async compare(password: string, hash: string): Promise<boolean> {
    if (!password || !hash) {
      return false;
    }

    try {
      return await bcrypt.compare(password, hash);
    } catch (err) {
      // Invalid hash format or other bcrypt errors
      logError('Password comparison error:', err instanceof Error ? err : undefined);
      return false;
    }
  }

  /**
   * Validates if a string is a valid bcrypt hash
   */
  isValidHash(hash: string): boolean {
    // Bcrypt hash format: $2b$rounds$salthash (60 chars)
    const bcryptRegex = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;
    return bcryptRegex.test(hash);
  }
}
