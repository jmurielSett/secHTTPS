import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { VerifyUserAccessUseCase } from '@/domain/usecases/VerifyUserAccessUseCase';
import { MemoryCacheService } from '@/infrastructure/cache/MemoryCacheService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('VerifyUserAccessUseCase', () => {
  let useCase: VerifyUserAccessUseCase;
  let mockUserRepository: IUserRepository;
  let mockCacheService: MemoryCacheService;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    // Mock CacheService
    mockCacheService = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      deletePattern: vi.fn(),
      clear: vi.fn(),
      getStats: vi.fn()
    } as any;

    useCase = new VerifyUserAccessUseCase(mockUserRepository, mockCacheService);
  });

  describe('Cache Hit (sin consultar BD)', () => {
    it('should use cached roles on second call (cache hit)', async () => {
      const userId = '1';
      const applicationName = 'testApp';
      const expectedRoles = ['admin', 'editor'];
      
      // Primera llamada: cache miss
      vi.mocked(mockCacheService.get).mockReturnValueOnce(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValueOnce(expectedRoles);
      
      const result1 = await useCase.execute(userId, applicationName, 'admin');
      
      expect(mockUserRepository.getUserRolesByApplication).toHaveBeenCalledWith(userId, applicationName);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(`user:${userId}:app:${applicationName}`),
        expectedRoles,
        expect.any(Number)
      );
      expect(result1).toBe(true);
      
      // Segunda llamada: cache hit
      vi.mocked(mockCacheService.get).mockReturnValueOnce(expectedRoles);
      
      const result2 = await useCase.execute(userId, applicationName, 'editor');
      
      // No debe llamar a repository en segunda vez
      expect(mockUserRepository.getUserRolesByApplication).toHaveBeenCalledTimes(1);
      expect(result2).toBe(true);
    });

    it('should not call repository when cache hit', async () => {
      const cachedRoles = ['viewer'];
      vi.mocked(mockCacheService.get).mockReturnValue(cachedRoles);
      
      await useCase.execute('1', 'app', 'viewer');
      
      expect(mockUserRepository.getUserRolesByApplication).not.toHaveBeenCalled();
    });

    it('should return true when user has required role (cached)', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin', 'editor']);
      
      const result = await useCase.execute('1', 'app', 'editor');
      
      expect(result).toBe(true);
    });
  });

  describe('Cache Miss (consulta BD)', () => {
    it('should fetch from repository on first call (cache miss)', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['admin']);
      
      await useCase.execute('1', 'app', 'admin');
      
      expect(mockUserRepository.getUserRolesByApplication).toHaveBeenCalledOnce();
      expect(mockUserRepository.getUserRolesByApplication).toHaveBeenCalledWith('1', 'app');
    });

    it('should store roles in cache after fetching', async () => {
      const roles = ['viewer', 'editor'];
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(roles);
      
      await useCase.execute('123', 'myApp', 'viewer');
      
      expect(mockCacheService.set).toHaveBeenCalledWith(
        'user:123:app:myApp:roles',
        roles,
        expect.any(Number)
      );
    });

    it('should set correct TTL when caching', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue(['admin']);
      
      await useCase.execute('1', 'app', 'admin');
      
      // TTL debe ser 60 segundos (= JWT_CONFIG.ACCESS_EXPIRATION_SECONDS = 1 min)
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        60 // CACHE_CONFIG.TTL_SECONDS = JWT_CONFIG.ACCESS_EXPIRATION_SECONDS
      );
    });
  });

  describe('Verificación de Roles', () => {
    it('should return true when user has exact role', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin', 'editor']);
      
      const result = await useCase.execute('1', 'app', 'admin');
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks role', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['viewer']);
      
      const result = await useCase.execute('1', 'app', 'admin');
      
      expect(result).toBe(false);
    });

    it('should be case-sensitive for role names', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['Admin']); // Capital A
      
      const result = await useCase.execute('1', 'app', 'admin'); // lowercase
      
      expect(result).toBe(false);
    });

    it('should return false for empty roles array', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue([]);
      
      const result = await useCase.execute('1', 'app', 'admin');
      
      expect(result).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has at least one required role', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['viewer', 'editor']);
      
      const result = await useCase.hasAnyRole('1', 'app', ['admin', 'editor']);
      
      expect(result).toBe(true);
    });

    it('should return false when user has none of the required roles', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['viewer']);
      
      const result = await useCase.hasAnyRole('1', 'app', ['admin', 'editor']);
      
      expect(result).toBe(false);
    });

    it('should return false for empty required roles', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin']);
      
      const result = await useCase.hasAnyRole('1', 'app', []);
      
      expect(result).toBe(false);
    });

    it('should use cache correctly', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin']);
      
      await useCase.hasAnyRole('1', 'app', ['admin', 'editor']);
      
      expect(mockUserRepository.getUserRolesByApplication).not.toHaveBeenCalled();
    });
  });

  describe('hasAllRoles', () => {
    it('should return true when user has all required roles', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin', 'editor', 'viewer']);
      
      const result = await useCase.hasAllRoles('1', 'app', ['admin', 'editor']);
      
      expect(result).toBe(true);
    });

    it('should return false when user lacks one required role', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin', 'viewer']);
      
      const result = await useCase.hasAllRoles('1', 'app', ['admin', 'editor']);
      
      expect(result).toBe(false);
    });

    it('should return true for empty required roles array', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin']);
      
      const result = await useCase.hasAllRoles('1', 'app', []);
      
      expect(result).toBe(true);
    });

    it('should return false when user has no roles', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue([]);
      
      const result = await useCase.hasAllRoles('1', 'app', ['admin']);
      
      expect(result).toBe(false);
    });
  });

  describe('Invalidación de Cache', () => {
    it('invalidateUserCache should delete all user entries', () => {
      useCase.invalidateUserCache('123');
      
      expect(mockCacheService.deletePattern).toHaveBeenCalledWith('user:123:');
    });

    it('invalidateUserAppCache should delete specific app entry', () => {
      useCase.invalidateUserAppCache('456', 'myApp');
      
      expect(mockCacheService.delete).toHaveBeenCalledWith('user:456:app:myApp:roles');
    });

    it('should fetch fresh data after cache invalidation', async () => {
      // Primera llamada con cache
      vi.mocked(mockCacheService.get).mockReturnValueOnce(['viewer']);
      const result1 = await useCase.execute('1', 'app', 'viewer');
      expect(result1).toBe(true);
      
      // Invalidar cache
      useCase.invalidateUserAppCache('1', 'app');
      
      // Segunda llamada: cache miss, fetch de BD
      vi.mocked(mockCacheService.get).mockReturnValueOnce(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValueOnce(['admin']);
      
      const result2 = await useCase.execute('1', 'app', 'admin');
      
      expect(mockUserRepository.getUserRolesByApplication).toHaveBeenCalled();
      expect(result2).toBe(true);
    });
  });

  describe('Casos Edge', () => {
    it('should handle empty roles array from repository', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue([]);
      
      const result = await useCase.execute('1', 'app', 'admin');
      
      expect(result).toBe(false);
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.any(Number)
      );
    });

    it('should cache empty roles array', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockResolvedValue([]);
      
      await useCase.execute('1', 'app', 'admin');
      
      // Debe cachear [] para evitar consultas BD repetidas
      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        [],
        expect.any(Number)
      );
    });

    it('should handle repository errors gracefully', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(undefined);
      vi.mocked(mockUserRepository.getUserRolesByApplication).mockRejectedValue(
        new Error('Database connection failed')
      );
      
      await expect(useCase.execute('1', 'app', 'admin')).rejects.toThrow('Database connection failed');
      
      // No debe cachear error
      expect(mockCacheService.set).not.toHaveBeenCalled();
    });

    it('should handle special characters in userId and appName', async () => {
      const userId = 'user@example.com';
      const appName = 'my-app_v2';
      
      vi.mocked(mockCacheService.get).mockReturnValue(['admin']);
      
      await useCase.execute(userId, appName, 'admin');
      
      expect(mockCacheService.get).toHaveBeenCalledWith(
        `user:${userId}:app:${appName}:roles`
      );
    });
  });

  describe('Construcción de Cache Keys', () => {
    it('should use correct cache key format', async () => {
      vi.mocked(mockCacheService.get).mockReturnValue(['admin']);
      
      await useCase.execute('user123', 'appXYZ', 'admin');
      
      expect(mockCacheService.get).toHaveBeenCalledWith('user:user123:app:appXYZ:roles');
    });

    it('should use same key format for invalidation', () => {
      const userId = 'test-user';
      const appName = 'test-app';
      
      useCase.invalidateUserAppCache(userId, appName);
      
      expect(mockCacheService.delete).toHaveBeenCalledWith(
        `user:${userId}:app:${appName}:roles`
      );
    });
  });
});
