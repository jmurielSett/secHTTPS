import { IApplicationRepository } from '../../domain/repositories/IApplicationRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginDTO, LoginResponse } from '../../types/user';
import { authLog, logWarn } from '../../utils/logger';
import { AuthenticationResult, IAuthenticationProvider } from '../services/IAuthenticationProvider';
import { IPasswordHasher } from '../services/IPasswordHasher';
import { ITokenService } from '../services/ITokenService';
import { AuthProvider } from '../value-objects/AuthProvider';
import { AssignRoleUseCase } from './RoleManagementUseCases';

/**
 * Login Use Case
 * Authenticates a user using multiple authentication providers (LDAP, Database, etc.)
 * with fallback support and per-application auto-creation of LDAP users
 */
export class LoginUseCase {
  constructor(
    private readonly userRepository: IUserRepository,
    private readonly applicationRepository: IApplicationRepository | null,
    private readonly tokenService: ITokenService,
    private readonly passwordHasher: IPasswordHasher,
    private readonly authProviders: IAuthenticationProvider[] = [],
    private readonly assignRoleUseCase?: AssignRoleUseCase
  ) {}

  async execute(loginDto: LoginDTO): Promise<LoginResponse> {
    authLog(`[Auth] 🔐 Login attempt: ${loginDto.username} → ${loginDto.applicationName || 'multi-app'}`);

    // 1. Authenticate user with available providers
    const authContext = await this.authenticateWithProviders(loginDto);
    authLog(`[Auth] ✅ Authenticated via ${authContext.providerName}`);

    const authProvider = AuthProvider.fromString(authContext.authProviderValue);

    // 2. Ensure user exists in database (for role management)
    const user = await this.ensureUserInDatabase(
      authContext.username,
      authProvider,
      authContext.authResult,
      loginDto.applicationName
    );
    
    user.authProvider = authProvider.value;

    // 3. Generate token pair (single-app or multi-app)
    const tokenPair = await this.generateTokenPair(
      user,
      authProvider.value,
      loginDto.applicationName
    );

    // 4. Return response
    return {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      user: {
        id: String(user.id),
        username: user.username,
        role: user.role || 'user',
        authProvider: authProvider.value
      }
    };
  }

  /**
   * Authenticates user using available authentication providers
   */
  private async authenticateWithProviders(loginDto: LoginDTO): Promise<{
    username: string;
    authResult: AuthenticationResult;
    providerName: string;
    authProviderValue: string;
  }> {
    for (const provider of this.authProviders) {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) continue;
      
      const result = await provider.authenticate(loginDto.username, loginDto.password);
      
      if (result.success) {
        const username = result.username || loginDto.username;
        const authProviderValue = result.providerDetails || provider.name;
        
        return {
          username,
          authResult: result,
          providerName: provider.name,
          authProviderValue
        };
      }
    }

    throw new Error('Invalid credentials');
  }

  /**
   * Ensures user exists in database, creating if necessary or assigning default role
   */
  private async ensureUserInDatabase(
    username: string,
    authProvider: AuthProvider,
    authResult: AuthenticationResult,
    applicationName?: string
  ): Promise<any> {
    let user = await this.userRepository.findByUsername(username);
    
    if (user) {
      await this.ensureDefaultRoleForLdapUser(user, authProvider, applicationName);
      return user;
    }

    // User not found - create if allowed
    const shouldCreateUser = await this.shouldCreateLDAPUser(applicationName);
    
    if (!shouldCreateUser) {
      throw new Error(`User authenticated but not authorized for application '${applicationName || 'any'}'. Please contact administrator.`);
    }

    user = await this.createLDAPUser(authResult, authProvider.value, applicationName);
    authLog(`[Auth] ✅ User created in DB: ${username}`);
    
    return user;
  }

  /**
   * Assigns default role to LDAP users without roles
   */
  private async ensureDefaultRoleForLdapUser(
    user: any,
    authProvider: AuthProvider,
    applicationName?: string
  ): Promise<void> {
    if (!authProvider.isLdap() || !applicationName || !this.applicationRepository || !this.assignRoleUseCase) {
      return;
    }

    const roles = await this.userRepository.getUserRolesByApplication(
      String(user.id),
      applicationName
    );
    
    if (roles.length > 0) return;

    const appConfig = await this.applicationRepository.getApplicationLdapConfig(applicationName);
    
    if (!appConfig?.allowLdapSync || !appConfig?.ldapDefaultRole) return;

    try {
      await this.assignRoleUseCase.execute({
        userId: String(user.id),
        applicationName: applicationName,
        roleName: appConfig.ldapDefaultRole
      });
      authLog(`[Auth] ✅ Assigned default role: ${appConfig.ldapDefaultRole}`);
    } catch (error) {
      logWarn(`[Auth] Failed to assign default role: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates token pair for single-app or multi-app access
   */
  private async generateTokenPair(
    user: any,
    authProviderValue: string,
    applicationName?: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (applicationName) {
      return await this.generateSingleAppToken(user, authProviderValue, applicationName);
    }
    
    return await this.generateMultiAppToken(user, authProviderValue);
  }

  /**
   * Generates token for single application
   */
  private async generateSingleAppToken(
    user: any,
    authProviderValue: string,
    applicationName: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const roles = await this.userRepository.getUserRolesByApplication(
      String(user.id),
      applicationName
    );

    if (roles.length === 0) {
      throw new Error(`User does not have access to application: ${applicationName}`);
    }

    authLog(`[Auth] ✅ Token generated for ${applicationName}: [${roles.join(', ')}]`);
    
    return this.tokenService.generateTokenPair(
      String(user.id),
      user.username,
      applicationName,
      roles,
      undefined,
      authProviderValue
    );
  }

  /**
   * Generates token for multiple applications
   */
  private async generateMultiAppToken(
    user: any,
    authProviderValue: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const applications = await this.userRepository.getAllUserRoles(String(user.id));

    if (applications.length === 0) {
      throw new Error('User does not have access to any application');
    }

    authLog(`[Auth] ✅ Multi-app token generated: ${applications.length} app(s)`);

    return this.tokenService.generateTokenPair(
      String(user.id),
      user.username,
      undefined,
      undefined,
      applications,
      authProviderValue
    );
  }

  /**
   * Determines if LDAP user should be auto-created based on application configuration
   */
  private async shouldCreateLDAPUser(applicationName?: string): Promise<boolean> {
    // Application name is required for LDAP sync
    if (!applicationName) {
      logWarn('[Auth] No application specified, denying LDAP user creation');
      return false;
    }

    // Application repository is required
    if (!this.applicationRepository) {
      logWarn('[Auth] No application repository available, denying LDAP user creation');
      return false;
    }

    // Check application-specific config
    const appConfig = await this.applicationRepository.getApplicationLdapConfig(applicationName);
    
    if (!appConfig) {
      logWarn(`[Auth] Application '${applicationName}' not found, denying LDAP user creation`);
      return false;
    }

    return appConfig.allowLdapSync;
  }

  /**
   * Creates a new user in database after successful LDAP authentication
   * Assigns role based on application configuration or global fallback
   */
  private async createLDAPUser(
    authResult: AuthenticationResult, 
    providerValue: string, 
    applicationName?: string
  ): Promise<any> {
    const username = authResult.username!;
    const email = authResult.email || `${username}@ldap.local`;
    
    // Create user with a dummy password (won't be used if LDAP is enabled)
    const newUser = await this.userRepository.create({
      username,
      email,
      passwordHash: await this.passwordHasher.hash(`LDAP_USER_${Date.now()}`),
      authProvider: providerValue,
      createdAt: new Date().toISOString()
    } as any);

    // Assign default role if configured for the application
    if (applicationName && this.applicationRepository && this.assignRoleUseCase) {
      const appConfig = await this.applicationRepository.getApplicationLdapConfig(applicationName);
      
      if (appConfig?.ldapDefaultRole) {
        try {
          await this.assignRoleUseCase.execute({
            userId: String(newUser.id),
            applicationName: applicationName,
            roleName: appConfig.ldapDefaultRole
          });
        } catch (error) {
          logWarn(`[Auth] Failed to assign default role: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    return newUser;
  }
}
