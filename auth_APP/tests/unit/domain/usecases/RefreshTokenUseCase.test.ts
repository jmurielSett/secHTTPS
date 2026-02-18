import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { ITokenService } from '@/domain/services';
import { RefreshTokenUseCase } from '@/domain/usecases/RefreshTokenUseCase';
import { TokenPayload, User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockUserRepository: IUserRepository;
  let mockTokenService: ITokenService;

  const existingUser: User = {
    id: 1,
    username: 'admin',
    email: 'admin@auth.com',
    passwordHash: 'hashed',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  const newTokenPair = { accessToken: 'new-access', refreshToken: 'new-refresh' };

  beforeEach(() => {
    mockUserRepository = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    mockTokenService = {
      generateTokenPair: vi.fn().mockReturnValue(newTokenPair),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn()
    } as any;

    useCase = new RefreshTokenUseCase(mockUserRepository, mockTokenService);
  });

  describe('Single-app token refresh', () => {
    it('should return new token pair for valid single-app refresh token', async () => {
      const payload: TokenPayload = {
        userId: '1',
        username: 'admin',
        applicationName: 'secHTTPS_APP',
        roles: ['admin'],
        authProvider: 'DATABASE',
        type: 'refresh'
      };

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['admin']);

      const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        '1',
        'admin',
        'secHTTPS_APP',
        ['admin'],
        undefined,
        'DATABASE'
      );
    });

    it('should throw if user no longer has roles in the application', async () => {
      const payload: TokenPayload = {
        userId: '1',
        username: 'admin',
        applicationName: 'secHTTPS_APP',
        type: 'refresh'
      };

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue([]);

      await expect(
        useCase.execute({ refreshToken: 'valid-refresh-token' })
      ).rejects.toThrow('User no longer has access to application: secHTTPS_APP');
    });
  });

  describe('Multi-app token refresh', () => {
    it('should return new multi-app token pair for valid multi-app refresh token', async () => {
      const payload: TokenPayload = {
        userId: '1',
        username: 'admin',
        authProvider: 'DATABASE',
        type: 'refresh'
        // no applicationName → multi-app
      };

      const applications = [
        { applicationName: 'secHTTPS_APP', roles: ['admin'] },
        { applicationName: 'auth_APP', roles: ['super_admin'] }
      ];

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getAllUserRoles).mockResolvedValue(applications);

      const result = await useCase.execute({ refreshToken: 'valid-refresh-token' });

      expect(result.accessToken).toBe('new-access');
      expect(mockTokenService.generateTokenPair).toHaveBeenCalledWith(
        '1',
        'admin',
        undefined,
        undefined,
        applications,
        'DATABASE'
      );
    });

    it('should throw if user no longer has roles in any application', async () => {
      const payload: TokenPayload = {
        userId: '1',
        username: 'admin',
        type: 'refresh'
      };

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getAllUserRoles).mockResolvedValue([]);

      await expect(
        useCase.execute({ refreshToken: 'valid-refresh-token' })
      ).rejects.toThrow('User no longer has access to any application');
    });
  });

  describe('Failures', () => {
    it('should throw if refresh token is invalid', async () => {
      vi.mocked(mockTokenService.verifyRefreshToken).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        useCase.execute({ refreshToken: 'expired-token' })
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should throw if user no longer exists', async () => {
      const payload: TokenPayload = {
        userId: '999',
        username: 'ghost',
        applicationName: 'secHTTPS_APP',
        type: 'refresh'
      };

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(
        useCase.execute({ refreshToken: 'valid-token' })
      ).rejects.toThrow('User not found');
    });
  });

  describe('Response shape', () => {
    it('should include user info in response', async () => {
      const payload: TokenPayload = {
        userId: '1',
        username: 'admin',
        applicationName: 'secHTTPS_APP',
        authProvider: 'DATABASE',
        type: 'refresh'
      };

      vi.mocked(mockTokenService.verifyRefreshToken).mockReturnValue(payload);
      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['admin']);

      const result = await useCase.execute({ refreshToken: 'valid-token' });

      expect(result.user).toMatchObject({
        id: '1',
        username: 'admin'
      });
    });
  });
});
