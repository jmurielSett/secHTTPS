import { ApplicationRole, TokenPair, TokenPayload } from '../../types/user';

/**
 * Token Service Interface
 * Contract for JWT token operations (stateless authentication)
 */
export interface ITokenService {
  /**
   * Generates both access and refresh tokens
   * @param userId - User unique identifier
   * @param username - Username
   * @param applicationName - Optional: application name for single-app token
   * @param roles - Optional: roles for single app (required if applicationName provided)
   * @param applications - Optional: all apps with roles for multi-app token (used if applicationName not provided)
   * @returns Token pair (access + refresh)
   */
  generateTokenPair(
    userId: string, 
    username: string, 
    applicationName?: string,
    roles?: string[],
    applications?: ApplicationRole[]
  ): TokenPair;

  /**
   * Verifies and decodes an access token
   * @param token - Access token to verify
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyAccessToken(token: string): TokenPayload;

  /**
   * Verifies and decodes a refresh token
   * @param token - Refresh token to verify
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyRefreshToken(token: string): TokenPayload;
}
