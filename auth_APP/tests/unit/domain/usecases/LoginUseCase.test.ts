import { IApplicationRepository } from '@/domain/repositories/IApplicationRepository';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IPasswordHasher, ITokenService } from '@/domain/services';
import { IAuthenticationProvider } from '@/domain/services/IAuthenticationProvider';
import { LoginUseCase } from '@/domain/usecases/LoginUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('LoginUseCase', () => {
  let useCase: LoginUseCase;
  let mockUserRepository: IUserRepository;
  let mockApplicationRepository: IApplicationRepository;
  let mockTokenService: ITokenService;
  let mockPasswordHasher: IPasswordHasher;
  let mockAuthProvider: IAuthenticationProvider;

  const existingUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@auth.com',
    passwordHash: 'hashed',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const tokenPair = { accessToken: 'access-token', refreshToken: 'refresh-token' };

  beforeEach(() => {
    mockUserRepository = {
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    mockApplicationRepository = {
      findByName: vi.fn(),
      getApplicationLdapConfig: vi.fn()
    } as any;

    mockTokenService = {
      generateTokenPair: vi.fn().mockReturnValue(tokenPair),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn()
    } as any;

    mockPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn()
    } as any;

    mockAuthProvider = {
      name: 'Database',
      authenticate: vi.fn(),
      isAvailable: vi.fn().mockResolvedValue(true)
    } as any;

    useCase = new LoginUseCase(
      mockUserRepository,
      mockApplicationRepository,
      mockTokenService,
      mockPasswordHasher,
      [mockAuthProvider]
    );
  });

  describe('Single-app login', () => {
    it('should return token pair on successful login for a specific application', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: true,
        username: 'admin',
        providerDetails: 'DATABASE'
      });
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['admin']);

      const result = await useCase.execute({
        username: 'admin',
        password: 'Admin123',
        applicationName: 'secHTTPS_APP'
      });

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.username).toBe('admin');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        '1',
        'admin',
        'secHTTPS_APP',
        ['admin'],
        undefined,
        'DATABASE'
      );
    });

    it('should throw if user has no roles in the target application', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: true,
        username: 'admin',
        providerDetails: 'DATABASE'
      });
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue([]);

      await expect(
        useCase.execute({ username: 'admin', password: 'Admin123', applicationName: 'secHTTPS_APP' })
      ).rejects.toThrow('User does not have access to application: secHTTPS_APP');
    });
  });

  describe('Multi-app login', () => {
    it('should return multi-app token when no applicationName is specified', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: true,
        username: 'admin',
        providerDetails: 'DATABASE'
      });
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getAllUserRoles).mockResolvedValue([
        { applicationName: 'secHTTPS_APP', roles: ['admin'] },
        { applicationName: 'auth_APP', roles: ['super_admin'] }
      ]);

      const result = await useCase.execute({ username: 'admin', password: 'Admin123' });

      expect(result.accessToken).toBe('access-token');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        '1',
        'admin',
        undefined,
        undefined,
        expect.arrayContaining([
          expect.objectContaining({ applicationName: 'secHTTPS_APP' })
        ]),
        'DATABASE'
      );
    });

    it('should throw if user has no roles in any application', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: true,
        username: 'admin',
        providerDetails: 'DATABASE'
      });
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getAllUserRoles).mockResolvedValue([]);

      await expect(
        useCase.execute({ username: 'admin', password: 'Admin123' })
      ).rejects.toThrow('User does not have access to any application');
    });
  });

  describe('Authentication failures', () => {
    it('should throw if all providers fail authentication', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: false,
        error: 'Bad credentials'
      });

      await expect(
        useCase.execute({ username: 'admin', password: 'wrong', applicationName: 'secHTTPS_APP' })
      ).rejects.toThrow('Invalid credentials');
    });

    it('should skip unavailable providers and try next', async () => {
      const unavailableProvider: IAuthenticationProvider = {
        name: 'LDAP',
        authenticate: vi.fn(),
        isAvailable: vi.fn().mockResolvedValue(false)
      };

      const dbProvider: IAuthenticationProvider = {
        name: 'Database',
        authenticate: vi.fn().mockResolvedValue({
          success: true,
          username: 'admin',
          providerDetails: 'DATABASE'
        }),
        isAvailable: vi.fn().mockResolvedValue(true)
      };

      useCase = new LoginUseCase(
        mockUserRepository,
        mockApplicationRepository,
        mockTokenService,
        mockPasswordHasher,
        [unavailableProvider, dbProvider]
      );

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['user']);

      const result = await useCase.execute({
        username: 'admin',
        password: 'Admin123',
        applicationName: 'secHTTPS_APP'
      });

      expect(result.user.username).toBe('admin');
      expect(unavailableProvider.authenticate).not.toHaveBeenCalled();
      expect(dbProvider.authenticate).toHaveBeenCalled();
    });

    it('should throw if no providers are configured', async () => {
      useCase = new LoginUseCase(
        mockUserRepository,
        mockApplicationRepository,
        mockTokenService,
        mockPasswordHasher,
        [] // no providers
      );

      await expect(
        useCase.execute({ username: 'admin', password: 'Admin123' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('Response shape', () => {
    it('should include user id, username, role and authProvider in response', async () => {
      vi.mocked(mockAuthProvider.authenticate).mockResolvedValue({
        success: true,
        username: 'admin',
        providerDetails: 'DATABASE'
      });
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getAllUserRoles).mockResolvedValue([
        { applicationName: 'secHTTPS_APP', roles: ['admin'] }
      ]);

      const result = await useCase.execute({ username: 'admin', password: 'Admin123' });

      expect(result.user).toMatchObject({
        id: '1',
        username: 'admin',
        authProvider: 'DATABASE'
      });
    });
  });
});
