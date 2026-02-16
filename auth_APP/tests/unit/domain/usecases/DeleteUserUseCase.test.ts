import { DomainError } from '@/domain/errors/DomainError';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { DeleteUserUseCase } from '@/domain/usecases/DeleteUserUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DeleteUserUseCase', () => {
  let useCase: DeleteUserUseCase;
  let mockUserRepository: IUserRepository;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    useCase = new DeleteUserUseCase(mockUserRepository);
  });

  describe('Successful Deletion', () => {
    it('should delete existing user successfully', async () => {
      const existingUser: User = {
        id: 10,
        username: 'usertodelete',
        email: 'delete@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      await expect(useCase.execute('10')).resolves.not.toThrow();

      expect(mockUserRepository.findById).toHaveBeenCalledWith('10');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('10');
    });

    it('should call repository delete with correct userId', async () => {
      const user: User = {
        id: 42,
        username: 'user42',
        email: 'user42@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      await useCase.execute('42');

      expect(mockUserRepository.delete).toHaveBeenCalledOnce();
      expect(mockUserRepository.delete).toHaveBeenCalledWith('42');
    });

    it('should complete without returning value', async () => {
      const user: User = {
        id: 5,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      const result = await useCase.execute('5');

      expect(result).toBeUndefined();
    });

    it('should handle numeric string IDs', async () => {
      const user: User = {
        id: 123,
        username: 'numeric',
        email: 'numeric@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      await useCase.execute('123');

      expect(mockUserRepository.findById).toHaveBeenCalledWith('123');
      expect(mockUserRepository.delete).toHaveBeenCalledWith('123');
    });

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
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      await useCase.execute(uuid);

      expect(mockUserRepository.delete).toHaveBeenCalledWith(uuid);
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

    it('should not attempt deletion if user not found', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('123')).rejects.toThrow();

      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle empty userId', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('')).rejects.toThrow('User not found');
    });
  });

  describe('Deletion Failures', () => {
    it('should throw DomainError when deletion fails', async () => {
      const user: User = {
        id: 10,
        username: 'user',
        email: 'user@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(false);

      await expect(useCase.execute('10')).rejects.toThrow(DomainError);
      await expect(useCase.execute('10')).rejects.toThrow('Failed to delete user');
    });

    it('should throw DomainError with correct code on deletion failure', async () => {
      const user: User = {
        id: 20,
        username: 'user20',
        email: 'user20@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(false);

      try {
        await useCase.execute('20');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('DELETE_FAILED');
        expect((error as DomainError).message).toBe('Failed to delete user');
      }
    });

    it('should handle repository returning false', async () => {
      const user: User = {
        id: 30,
        username: 'faildelete',
        email: 'fail@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(false);

      await expect(useCase.execute('30')).rejects.toThrow('Failed to delete user');
    });
  });

  describe('Error Handling', () => {
    it('should propagate repository findById errors', async () => {
      vi.mocked(mockUserRepository.findById).mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(useCase.execute('5')).rejects.toThrow('Database connection lost');
    });

    it('should propagate repository delete errors', async () => {
      const user: User = {
        id: 15,
        username: 'erroruser',
        email: 'error@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockRejectedValue(
        new Error('Foreign key constraint violation')
      );

      await expect(useCase.execute('15')).rejects.toThrow('Foreign key constraint violation');
    });

    it('should handle database timeout during delete', async () => {
      const user: User = {
        id: 25,
        username: 'timeoutuser',
        email: 'timeout@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockRejectedValue(
        new Error('Query timeout')
      );

      await expect(useCase.execute('25')).rejects.toThrow('Query timeout');
    });

    it('should handle concurrent deletion attempts', async () => {
      const user: User = {
        id: 35,
        username: 'concurrent',
        email: 'concurrent@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockRejectedValue(
        new Error('Record no longer exists')
      );

      await expect(useCase.execute('35')).rejects.toThrow('Record no longer exists');
    });
  });

  describe('Edge Cases', () => {
    it('should validate user exists before attempting delete', async () => {
      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute('0')).rejects.toThrow();

      // No se debe llamar a delete si el usuario no existe
      expect(mockUserRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle special character IDs', async () => {
      const specialId = 'user-123-test';
      const user: User = {
        id: specialId,
        username: 'specialuser',
        email: 'special@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(user);
      vi.mocked(mockUserRepository.delete).mockResolvedValue(true);

      await useCase.execute(specialId);

      expect(mockUserRepository.delete).toHaveBeenCalledWith(specialId);
    });
  });
});
