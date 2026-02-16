
import { IApplicationRepository } from '../../domain/repositories/IApplicationRepository';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { LoginDTO, LoginResponse } from '../../types/user';
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
    console.log('\n' + '='.repeat(80));
    console.log(`[Auth] 🔐 LOGIN ATTEMPT`);
    console.log(`[Auth] User: ${loginDto.username}`);
    console.log(`[Auth] Application: ${loginDto.applicationName || 'ALL (multi-app token)'}`);
    console.log(`[Auth] Available providers: ${this.authProviders.map(p => p.name).join(', ')}`);
    console.log('='.repeat(80) + '\n');

    let userId: string | undefined;
    let username: string = loginDto.username;
    let authSuccess = false;
    let authResult: AuthenticationResult | undefined;
    let providerName: string = 'UNKNOWN';

    // 1. Try authentication providers in order (LDAP first, then Database)
    console.log('[Auth] 🔍 PHASE 1: Authentication Provider Chain');
    for (const provider of this.authProviders) {
      // Skip unavailable providers
      const isAvailable = await provider.isAvailable();
      if (!isAvailable) {
        console.log(`[Auth]   ⏭️  Provider ${provider.name} is not available, skipping...`);
        continue;
      }

      console.log(`[Auth]   🔑 Attempting authentication with provider: ${provider.name}`);
      
      const result = await provider.authenticate(loginDto.username, loginDto.password);
      
      if (result.success) {
        console.log(`[Auth]   ✅ Authentication successful with provider: ${provider.name}`);
        userId = result.userId;
        username = result.username || loginDto.username;
        authSuccess = true;
        authResult = result;
        providerName = provider.name;
        break;
      } else {
        console.log(`[Auth]   ❌ Authentication failed with ${provider.name}: ${result.error}`);
      }
    }

    if (!authSuccess || !userId) {
      console.log('[Auth] ❌ All authentication providers failed\n');
      throw new Error('Invalid credentials');
    }

    console.log(`[Auth] ✅ Provider '${providerName}' authenticated user successfully\n`);

    // Use providerDetails (e.g., 'DATABASE' or 'server_ldap_xxx') instead of generic provider name
    const authProviderValue = authResult?.providerDetails || providerName;
    const authProvider = AuthProvider.fromString(authProviderValue);

    // 2. Ensure user exists in database (for role management)
    console.log('[Auth] 🔍 PHASE 2: Database User Verification');
    let user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      console.log('[Auth]   ⚠️  User not found in database');
      // User authenticated via external provider but not in DB
      // Check if application allows LDAP sync (or use global fallback)
      const shouldCreateUser = await this.shouldCreateLDAPUser(loginDto.applicationName);
      
      if (shouldCreateUser) {
        console.log(`[Auth]   ✅ Application allows LDAP sync, creating user: ${username}`);
        user = await this.createLDAPUser(authResult!, authProvider.value, loginDto.applicationName);
        if (user) {
          console.log(`[Auth]   ✅ User created with ID: ${user.id}`);
        }
      } else {
        console.log(`[Auth]   ❌ Application does not allow LDAP sync\n`);
        throw new Error(`User authenticated but not authorized for application '${loginDto.applicationName || 'any'}'. Please contact administrator.`);
      }
    } else {
      console.log(`[Auth]   ✅ User found in database (ID: ${user.id})`);
      
      // If authenticated via LDAP and has no roles, try to assign default role
      if (authProvider.isLdap() && loginDto.applicationName && this.applicationRepository && this.assignRoleUseCase) {
        const roles = await this.userRepository.getUserRolesByApplication(
          String(user.id),
          loginDto.applicationName
        );
        
        if (roles.length === 0) {
          console.log(`[Auth]   ⚠️  LDAP user has no roles, checking default role...`);
          const appConfig = await this.applicationRepository.getApplicationLdapConfig(loginDto.applicationName);
          
          if (appConfig?.allowLdapSync && appConfig?.ldapDefaultRole) {
            try {
              await this.assignRoleUseCase.execute({
                userId: String(user.id),
                applicationName: loginDto.applicationName,
                roleName: appConfig.ldapDefaultRole
                // grantedBy is omitted for system-granted roles (will insert NULL)
              });
              console.log(`[Auth]   ✅ Assigned default role '${appConfig.ldapDefaultRole}' to LDAP user`);
            } catch (error) {
              console.warn(`[Auth]   ⚠️  Failed to assign default role: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
        }
      }
    }

    // TypeScript null safety check
    if (!user) {
      throw new Error('Failed to retrieve or create user in database');
    }
    
    // Set authProvider in memory only (not persisted to DB, used for JWT)
    user.authProvider = authProvider.value;
    console.log(`[Auth]   📝 Auth provider set to: ${authProvider.value}\n`);

    let tokenPair;

    // 3. Single-app token (if applicationName provided)
    console.log('[Auth] 🔍 PHASE 3: Authorization & Token Generation');
    if (loginDto.applicationName) {
      console.log(`[Auth]   🔐 Generating single-app token for: ${loginDto.applicationName}`);
      const roles = await this.userRepository.getUserRolesByApplication(
        String(user.id),
        loginDto.applicationName
      );

      if (roles.length === 0) {
        console.log(`[Auth]   ❌ User has no roles in application ${loginDto.applicationName}\n`);
        throw new Error(`User does not have access to application: ${loginDto.applicationName}`);
      }

      console.log(`[Auth]   ✅ User roles in ${loginDto.applicationName}: ${roles.join(', ')}`);
      
      // Generate token pair for specific application
      tokenPair = this.tokenService.generateTokenPair(
        String(user.id),
        user.username,
        loginDto.applicationName,
        roles,
        undefined,
        authProvider.value
      );
    } 
    // 4. Multi-app token (if no applicationName provided)
    else {
      console.log('[Auth]   🔐 Generating multi-app token');
      const applications = await this.userRepository.getAllUserRoles(String(user.id));

      if (applications.length === 0) {
        console.log('[Auth]   ❌ User has no roles in any application\n');
        throw new Error('User does not have access to any application');
      }

      console.log(`[Auth]   ✅ User has access to ${applications.length} application(s)`);
      applications.forEach(app => {
        console.log(`[Auth]      - ${app.applicationName}: [${app.roles.join(', ')}]`);
      });

      // Generate token pair with all applications
      tokenPair = this.tokenService.generateTokenPair(
        String(user.id),
        user.username,
        undefined,
        undefined,
        applications,
        authProvider.value
      );
    }

    console.log('[Auth]   ✅ JWT tokens generated successfully');
    console.log(`[Auth]   📝 Token includes authProvider: ${authProvider.value}`);
    console.log('\n' + '='.repeat(80));
    console.log('[Auth] ✅ LOGIN SUCCESSFUL');
    console.log('='.repeat(80) + '\n');

    // 5. Return response
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
   * Determines if LDAP user should be auto-created based on application configuration
   */
  private async shouldCreateLDAPUser(applicationName?: string): Promise<boolean> {
    // Application name is required for LDAP sync
    if (!applicationName) {
      console.warn('[Auth] No application specified, denying LDAP user creation');
      return false;
    }

    // Application repository is required
    if (!this.applicationRepository) {
      console.warn('[Auth] No application repository available, denying LDAP user creation');
      return false;
    }

    // Check application-specific config
    const appConfig = await this.applicationRepository.getApplicationLdapConfig(applicationName);
    
    if (!appConfig) {
      console.warn(`[Auth] Application '${applicationName}' not found, denying LDAP user creation`);
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
      passwordHash: await this.passwordHasher.hash(`LDAP_USER_${Date.now()}`), // Random hash
      authProvider: providerValue,
      createdAt: new Date().toISOString()
    } as any);

    console.log(`[Auth] Created user ${username} in database with ID: ${newUser.id}`);

    // Assign default role if configured for the application
    if (applicationName && this.applicationRepository && this.assignRoleUseCase) {
      const appConfig = await this.applicationRepository.getApplicationLdapConfig(applicationName);
      
      if (appConfig?.ldapDefaultRole) {
        try {
          await this.assignRoleUseCase.execute({
            userId: String(newUser.id),
            applicationName: applicationName,
            roleName: appConfig.ldapDefaultRole
            // grantedBy is omitted for system-granted roles (will insert NULL)
          });
          console.log(`[Auth] Assigned role '${appConfig.ldapDefaultRole}' to user ${username} in '${applicationName}'`);
        } catch (error) {
          console.warn(`[Auth] Failed to assign default role to LDAP user: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Don't fail login if role assignment fails
        }
      } else {
        console.log(`[Auth] No default role configured for application '${applicationName}', user created without roles`);
      }
    }

    return newUser;
  }
}
