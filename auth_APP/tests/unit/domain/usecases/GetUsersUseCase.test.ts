import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { GetUsersUseCase } from '@/domain/usecases/GetUsersUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GetUsersUseCase', () => {
  let useCase: GetUsersUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    useCase = new GetUsersUseCase(mockUserRepository);
  });

  describe('Successful User Retrieval', () => {
    it('should return all users without password hashes', async () => {
      const usersWithHashes: User[] = [
        {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          passwordHash: 'hashed_password_1',
          createdAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          username: 'user',
          email: 'user@example.com',
          passwordHash: 'hashed_password_2',
          createdAt: '2026-01-02T00:00:00.000Z'
        }
      ];

      vi.mocked(mockUserRepository.findAll).mockResolvedValue(usersWithHashes);

      const result = await useCase.execute();

      expect(result).toHaveLength(2);
      expect(result[0].passwordHash).toBeUndefined();
      expect(result[1].passwordHash).toBeUndefined();
      expect(result[0]).toEqual({
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        passwordHash: undefined,
        createdAt: '2026-01-01T00:00:00.000Z'
      });
    });

    it('should call repository findAll method', async () => {
      vi.mocked(mockUserRepository.findAll).mockResolvedValue([]);

      await useCase.execute();

      expect(mockUserRepository.findAll).toHaveBeenCalledOnce();
    });

    it('should return empty array when no users exist', async () => {
      vi.mocked(mockUserRepository.findAll).mockResolvedValue([]);

      const result = await useCase.execute();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should preserve all user properties except password hash', async () => {
      const users: User[] = [
        {
          id: 10,
          username: 'testuser',
          email: 'test@example.com',
          passwordHash: 'secret_hash',
          createdAt: '2026-02-15T10:00:00.000Z'
        }
      ];

      vi.mocked(mockUserRepository.findAll).mockResolvedValue(users);

      const result = await useCase.execute();

      expect(result[0]).toHaveProperty('id', 10);
      expect(result[0]).toHaveProperty('username', 'testuser');
      expect(result[0]).toHaveProperty('email', 'test@example.com');
      expect(result[0]).toHaveProperty('createdAt', '2026-02-15T10:00:00.000Z');
      expect(result[0].passwordHash).toBeUndefined();
    });
  });

  describe('Multiple Users', () => {
    it('should handle large number of users', async () => {
      const manyUsers: User[] = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        username: `user${i}`,
        email: `user${i}@example.com`,
        passwordHash: `hash${i}`,
        createdAt: '2026-01-01T00:00:00.000Z'
      }));

      vi.mocked(mockUserRepository.findAll).mockResolvedValue(manyUsers);

      const result = await useCase.execute();

      expect(result).toHaveLength(100);
      result.forEach(user => {
        expect(user.passwordHash).toBeUndefined();
      });
    });

    it('should remove password hash from every user in list', async () => {
      const users: User[] = [
        {
          id: 1,
          username: 'user1',
          email: 'user1@example.com',
          passwordHash: 'hash1',
          createdAt: '2026-01-01T00:00:00.000Z'
        },
        {
          id: 2,
          username: 'user2',
          email: 'user2@example.com',
          passwordHash: 'hash2',
          createdAt: '2026-01-02T00:00:00.000Z'
        },
        {
          id: 3,
          username: 'user3',
          email: 'user3@example.com',
          passwordHash: 'hash3',
          createdAt: '2026-01-03T00:00:00.000Z'
        }
      ];

      vi.mocked(mockUserRepository.findAll).mockResolvedValue(users);

      const result = await useCase.execute();

      expect(result.every(user => user.passwordHash === undefined)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should propagate repository errors', async () => {
      vi.mocked(mockUserRepository.findAll).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(useCase.execute()).rejects.toThrow('Database connection failed');
    });

    it('should handle repository timeout errors', async () => {
      vi.mocked(mockUserRepository.findAll).mockRejectedValue(
        new Error('Query timeout')
      );

      await expect(useCase.execute()).rejects.toThrow('Query timeout');
    });
  });
});
