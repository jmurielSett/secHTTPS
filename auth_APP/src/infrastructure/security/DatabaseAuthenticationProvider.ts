import { IUserRepository } from '../../domain/repositories/IUserRepository';
import {
  AuthenticationResult,
  IAuthenticationProvider
} from '../../domain/services/IAuthenticationProvider';
import { IPasswordHasher } from '../../domain/services/IPasswordHasher';
import { AUTH_PROVIDER_DATABASE } from '../../domain/value-objects/AuthProvider';

/**
 * Database Authentication Provider
 * Authenticates users against local database
 */
export class DatabaseAuthenticationProvider implements IAuthenticationProvider {
  readonly name = AUTH_PROVIDER_DATABASE;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly passwordHasher: IPasswordHasher
  ) {}

  async authenticate(username: string, password: string): Promise<AuthenticationResult> {
    try {
      // 1. Find user by username
      const user = await this.userRepository.findByUsername(username);

      if (!user) {
        return {
          success: false,
          error: 'User not found in database',
          isUserNotFoundInDb: true
        };
      }

      // 2. Verify password
      // dummy_hash OR authProvider != DATABASE = LDAP-synced user, cannot authenticate locally
      const isLdapUser = user.passwordHash === 'dummy_hash' ||
        (user.authProvider != null && user.authProvider !== AUTH_PROVIDER_DATABASE);
      if (isLdapUser) {
        return {
          success: false,
          error: 'LDAP user - cannot authenticate locally',
          isLdapOnlyUser: true
        };
      }

      const isPasswordValid = await this.passwordHasher.compare(password, user.passwordHash);

      if (!isPasswordValid) {
        // Password comparison was performed: user exists with a real hash.
        // This is a genuine credential failure regardless of auth_provider column value.
        return {
          success: false,
          error: 'Invalid password',
          isDatabaseUser: true
        };
      }

      // 3. Return success
      return {
        success: true,
        userId: String(user.id),
        username: user.username,
        email: user.email,
        providerDetails: AUTH_PROVIDER_DATABASE
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database authentication failed'
      };
    }
  }

  async isAvailable(): Promise<boolean> {
    // Database provider is always available if repository is configured
    return true;
  }
}
