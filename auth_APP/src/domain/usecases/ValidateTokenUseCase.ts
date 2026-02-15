import { ValidatedToken } from '../../types/user';
import { ITokenService } from '../services/ITokenService';

/**
 * Validate Token Use Case
 * Validates an access token and returns payload information
 * 
 * IMPORTANT: This only validates token signature and expiration (stateless).
 * It does NOT verify current permissions against database.
 * 
 * For real-time permission checks, use authorization middleware that queries
 * the database to ensure user still has those roles.
 */
export class ValidateTokenUseCase {
  constructor(private readonly tokenService: ITokenService) {}

  execute(accessToken: string): ValidatedToken {
    // 1. Verify access token signature and expiration
    let payload;
    try {
      payload = this.tokenService.verifyAccessToken(accessToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid or expired access token: ${message}`);
    }

    // 2. Return token payload (what the user claimed when they logged in)
    // NOTE: Roles in the token may be outdated if they were revoked after login
    return {
      userId: payload.userId,
      username: payload.username,
      applicationName: payload.applicationName,
      roles: payload.roles,
      applications: payload.applications,
      type: payload.type
    };
  }
}
