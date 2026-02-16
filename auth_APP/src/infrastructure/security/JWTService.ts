import jwt from 'jsonwebtoken';
import { ITokenService } from '../../domain/services/ITokenService';
import { JWT_CONFIG } from '../../types/shared';
import { ApplicationRole, TokenPair, TokenPayload } from '../../types/user';

/**
 * JWT Service
 * Handles generation and validation of JWT tokens (stateless)
 * Works with multiple server instances sharing the same secrets
 */
export class JWTService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor() {
    this.accessSecret = process.env.JWT_ACCESS_SECRET!;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET!;
    this.accessExpiresIn = JWT_CONFIG.ACCESS_EXPIRATION;
    this.refreshExpiresIn = JWT_CONFIG.REFRESH_EXPIRATION;

    this.validateSecrets();
  }

  private validateSecrets(): void {
    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error('JWT secrets must be defined in environment variables');
    }

    if (this.accessSecret.length < 32 || this.refreshSecret.length < 32) {
      throw new Error('JWT secrets must be at least 32 characters for security');
    }
  }

  /**
   * Generates both access and refresh tokens
   * @param userId - User unique identifier
   * @param username - Username
   * @param applicationName - Optional: application name for single-app token
   * @param roles - Optional: roles for single app
   * @param applications - Optional: all apps with roles for multi-app token
   * @param authProvider - Optional: authentication provider used (DATABASE, ldap://..., etc.)
   * @returns Token pair (access + refresh)
   */
  generateTokenPair(
    userId: string, 
    username: string, 
    applicationName?: string,
    roles?: string[],
    applications?: ApplicationRole[],
    authProvider?: string
  ): TokenPair {
    const accessToken = this.generateAccessToken(
      userId, username, applicationName, roles, applications, authProvider
    );
    const refreshToken = this.generateRefreshToken(
      userId, username, applicationName, roles, applications, authProvider
    );

    return { accessToken, refreshToken };
  }

  /**
   * Generates an access token (short-lived)
   */
  private generateAccessToken(
    userId: string, 
    username: string, 
    applicationName?: string,
    roles?: string[],
    applications?: ApplicationRole[],
    authProvider?: string
  ): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      username,
      type: 'access'
    };

    if (authProvider) {
      payload.authProvider = authProvider;
    }

    // Single-app token
    if (applicationName && roles) {
      payload.applicationName = applicationName;
      payload.roles = roles;
    }
    // Multi-app token
    else if (applications) {
      payload.applications = applications;
    }
    // Fallback: empty token (shouldn't happen)
    else {
      throw new Error('Either applicationName+roles or applications must be provided');
    }

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      issuer: 'auth-service',
      audience: 'sechttps-api'
    } as jwt.SignOptions);
  }

  /**
   * Generates a refresh token (long-lived)
   */
  private generateRefreshToken(
    userId: string, 
    username: string, 
    applicationName?: string,
    roles?: string[],
    applications?: ApplicationRole[],
    authProvider?: string
  ): string {
    const payload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      username,
      type: 'refresh'
    };

    if (authProvider) {
      payload.authProvider = authProvider;
    }

    // Single-app token
    if (applicationName && roles) {
      payload.applicationName = applicationName;
      payload.roles = roles;
    }
    // Multi-app token
    else if (applications) {
      payload.applications = applications;
    }
    // Fallback: empty token (shouldn't happen)
    else {
      throw new Error('Either applicationName+roles or applications must be provided');
    }

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: 'auth-service',
      audience: 'sechttps-api'
    } as jwt.SignOptions);
  }

  /**
   * Verifies and decodes an access token
   * @throws Error if token is invalid, expired, or malformed
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.accessSecret, {
        issuer: 'auth-service',
        audience: 'sechttps-api'
      }) as TokenPayload;

      if (payload.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid access token');
      }
      throw error;
    }
  }

  /**
   * Verifies and decodes a refresh token
   * @throws Error if token is invalid, expired, or malformed
   */
  verifyRefreshToken(token: string): TokenPayload {
    try {
      const payload = jwt.verify(token, this.refreshSecret, {
        issuer: 'auth-service',
        audience: 'sechttps-api'
      }) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Decodes a token without verification (for debugging)
   * WARNING: Do not use for authentication
   */
  decode(token: string): TokenPayload | null {
    return jwt.decode(token) as TokenPayload | null;
  }
}
