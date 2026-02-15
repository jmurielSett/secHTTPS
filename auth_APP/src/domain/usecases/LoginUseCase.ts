import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginDTO, LoginResponse } from '../../types/user';
import { IPasswordHasher } from '../services/IPasswordHasher';
import { ITokenService } from '../services/ITokenService';

/**
 * Login Use Case
 * Authenticates a user and generates JWT tokens
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async execute(loginDto: LoginDTO): Promise<LoginResponse> {
    // 1. Find user by username
    const user = await this.userRepository.findByUsername(loginDto.username);

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // 2. Verify password
    const isPasswordValid = await this.passwordHasher.compare(
      loginDto.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    let tokenPair;

    // 3. Single-app token (if applicationName provided)
    if (loginDto.applicationName) {
      const roles = await this.userRepository.getUserRolesByApplication(
        user.id,
        loginDto.applicationName
      );

      if (roles.length === 0) {
        throw new Error(`User does not have access to application: ${loginDto.applicationName}`);
      }

      // Generate token pair for specific application
      tokenPair = this.tokenService.generateTokenPair(
        user.id,
        user.username,
        loginDto.applicationName,
        roles
      );
    } 
    // 4. Multi-app token (if no applicationName provided)
    else {
      const applications = await this.userRepository.getAllUserRoles(user.id);

      if (applications.length === 0) {
        throw new Error('User does not have access to any application');
      }

      // Generate token pair with all applications
      tokenPair = this.tokenService.generateTokenPair(
        user.id,
        user.username,
        undefined,
        undefined,
        applications
      );
    }

    // 5. Return response
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }
}
