import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginResponse, RefreshTokenDTO } from '../../types/user';
import { ITokenService } from '../services/ITokenService';

/**
 * Refresh Token Use Case
 * Generates a new access token using a valid refresh token
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService
  ) {}

  async execute(refreshTokenDto: RefreshTokenDTO): Promise<LoginResponse> {
    // 1. Verify refresh token
    let payload;
    try {
      payload = this.tokenService.verifyRefreshToken(refreshTokenDto.refreshToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Invalid or expired refresh token: ${message}`);
    }

    // 2. Verify user still exists
    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new Error('User not found');
    }

    let tokenPair;

    // 3. Single-app token refresh
    if (payload.applicationName) {
      // Re-fetch current roles for the application (in case they changed)
      const roles = await this.userRepository.getUserRolesByApplication(
        String(user.id),
        payload.applicationName
      );

      if (roles.length === 0) {
        throw new Error(`User no longer has access to application: ${payload.applicationName}`);
      }

      // Generate new token pair with current roles
      tokenPair = this.tokenService.generateTokenPair(
        String(user.id),
        user.username,
        payload.applicationName,
        roles,
        undefined,
        payload.authProvider
      );
    }
    // 4. Multi-app token refresh
    else {
      // Re-fetch all current roles
      const applications = await this.userRepository.getAllUserRoles(String(user.id));

      if (applications.length === 0) {
        throw new Error('User no longer has access to any application');
      }

      // Generate new token pair with all applications
      tokenPair = this.tokenService.generateTokenPair(
        String(user.id),
        user.username,
        undefined,
        undefined,
        applications,
        payload.authProvider
      );
    }

    // 5. Return response with user info
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: String(user.id),
        username: user.username,
        role: user.role || 'user'
      }
    };
  }
}
