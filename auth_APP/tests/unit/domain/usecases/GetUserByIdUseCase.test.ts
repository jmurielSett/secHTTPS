import { DomainError } from '@/domain/errors/DomainError';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { GetUserByIdUseCase } from '@/domain/usecases/GetUserByIdUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
      findAll: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    useCase = new GetUserByIdUseCase(mockUserRepository);
  });

  describe('Successful User Retrieval', () => {
    it('should return user by ID without password hash', async () => {
      const userWithHash: User = {
        id: 5,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'super_secret_hash',
        createdAt: '2026-02-15T10:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(userWithHash);

      const result = await useCase.execute('5');

      expect(result).toEqual({
        id: 5,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: undefined,
        createdAt: '2026-02-15T10:00:00.000Z'
      });
      expect(result.passwordHash).toBeUndefined();
    });

    it('should call repository findById with correct ID', async () => {
      const user: User = {
        id: 10,
        username: 'user10',
        email: 'user10@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      await useCase.execute('10');

      expect(mockUserRepository.findById).toHaveBeenCalledOnce();
      expect(mockUserRepository.findById).toHaveBeenCalledWith('10');
    });

    it('should preserve all user properties except password hash', async () => {
      const user: User = {
        id: 42,
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: 'hidden_hash',
        createdAt: '2026-02-10T15:30:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await useCase.execute('42');

      expect(result).toHaveProperty('id', 42);
      expect(result).toHaveProperty('username', 'admin');
      expect(result).toHaveProperty('email', 'admin@example.com');
      expect(result).toHaveProperty('createdAt', '2026-02-10T15:30:00.000Z');
      expect(result.passwordHash).toBeUndefined();
      expect(result).not.toHaveProperty('passwordHash', 'hidden_hash');
    });

    it('should handle numeric string IDs', async () => {
      const user: User = {
        id: 123,
        username: 'numericuser',
        email: 'numeric@example.com',
        passwordHash: 'hash123',
        createdAt: '2026-01-15T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await useCase.execute('123');

      expect(result.id).toBe(123);
      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
    });
  });

  describe('User Not Found', () => {
    it('should throw DomainError when user does not exist', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('999')).rejects.toThrow(DomainError);
      await expect(useCase.execute('999')).rejects.toThrow('User not found');
    });

    it('should throw DomainError with correct code when user not found', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      try {
        await useCase.execute('nonexistent');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('USER_NOT_FOUND');
        expect((error as DomainError).message).toBe('User not found');
      }
    });

    it('should handle non-existent numeric IDs', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('0')).rejects.toThrow('User not found');
    });

    it('should handle empty string ID', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('')).rejects.toThrow('User not found');
    });
  });

  describe('Different ID Formats', () => {
    it('should handle UUID string IDs', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const user: User = {
        id: uuid,
        username: 'uuiduser',
        email: 'uuid@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await useCase.execute(uuid);

      expect(result.id).toBe(uuid);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(uuid);
    });

    it('should handle integer IDs', async () => {
      const user: User = {
        id: 1,
        username: 'firstuser',
        email: 'first@example.com',
        passwordHash: 'hash1',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);

      const result = await useCase.execute('1');

      expect(result.id).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should propagate repository errors', async () => {
      vi.mocked(mockUserRepository.findById).mockRejectedValue(
        new Error('Database connection error')
      );

      await expect(useCase.execute('5')).rejects.toThrow('Database connection error');
    });

    it('should handle repository timeout', async () => {
      vi.mocked(mockUserRepository.findById).mockRejectedValue(
        new Error('Query timeout exceeded')
      );

      await expect(useCase.execute('10')).rejects.toThrow('Query timeout exceeded');
    });

    it('should handle invalid database state', async () => {
      vi.mocked(mockUserRepository.findById).mockRejectedValue(
        new Error('Invalid row format')
      );

      await expect(useCase.execute('20')).rejects.toThrow('Invalid row format');
    });
  });
});
