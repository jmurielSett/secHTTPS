import { DomainError } from '@/domain/errors/DomainError';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IPasswordHasher } from '@/domain/services';
import { UpdateUserUseCase } from '@/domain/usecases/UpdateUserUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepository: IUserRepository;
  let mockPasswordHasher: IPasswordHasher;

  const existingUser: User = {
    id: 5,
    username: 'originaluser',
    email: 'original@example.com',
    passwordHash: 'original_hash',
    createdAt: '2026-01-01T00:00:00.000Z'
  };

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findById: vi.fn(),
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findAll: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    // Mock PasswordHasher
    mockPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn()
    } as any;

    useCase = new UpdateUserUseCase(mockUserRepository, mockPasswordHasher);
  });

  describe('Successful Updates', () => {
    it('should update username only', async () => {
      const input = {
        userId: '5',
        username: 'newusername'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockResolvedValue({
        ...existingUser,
        username: 'newusername'
      });

      const result = await useCase.execute(input);

      expect(result.username).toBe('newusername');
      expect(result.email).toBe('original@example.com');
      expect(result.passwordHash).toBeUndefined();
      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
    });

    it('should update email only', async () => {
      const input = {
        userId: '5',
        email: 'newemail@example.com'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockResolvedValue({
        ...existingUser,
        email: 'newemail@example.com'
      });

      const result = await useCase.execute(input);

      expect(result.email).toBe('newemail@example.com');
      expect(result.username).toBe('originaluser');
      expect(mockPasswordHasher.hash).not.toHaveBeenCalled();
    });

    it('should update password only', async () => {
      const input = {
        userId: '5',
        password: 'NewPassword123'
      };

      const newHash = 'new_hashed_password';

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(newHash);
      vi.mocked(mockUserRepository.update).mockResolvedValue({
        ...existingUser,
        passwordHash: newHash
      });

      const result = await useCase.execute(input);

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('NewPassword123');
      expect(result.username).toBe('originaluser');
      expect(result.email).toBe('original@example.com');
      expect(result.passwordHash).toBeUndefined();
    });

    it('should update all fields together', async () => {
      const input = {
        userId: '5',
        username: 'completelynew',
        email: 'completelynew@example.com',
        password: 'CompletelyNew123'
      };

      const newHash = 'completely_new_hash';

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(newHash);
      vi.mocked(mockUserRepository.update).mockResolvedValue({
        ...existingUser,
        username: 'completelynew',
        email: 'completelynew@example.com',
        passwordHash: newHash
      });

      const result = await useCase.execute(input);

      expect(result.username).toBe('completelynew');
      expect(result.email).toBe('completelynew@example.com');
      expect(result.passwordHash).toBeUndefined();
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('CompletelyNew123');
    });

    it('should allow updating to same username', async () => {
      const input = {
        userId: '5',
        username: 'originaluser' // Same as existing
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(existingUser);

      const result = await useCase.execute(input);

      expect(result.username).toBe('originaluser');
      // Should not check for duplicates if username hasn't changed
      expect(mockUserRepository.findByUsername).not.toHaveBeenCalled();
    });

    it('should allow updating to same email', async () => {
      const input = {
        userId: '5',
        email: 'original@example.com' // Same as existing
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(existingUser);

      const result = await useCase.execute(input);

      expect(result.email).toBe('original@example.com');
      // Should not check for duplicates if email hasn't changed
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('User Not Found', () => {
    it('should throw DomainError when user does not exist', async () => {
      const input = {
        userId: '999',
        username: 'newname'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('User not found');
    });

    it('should throw DomainError with correct code', async () => {
      const input = {
        userId: 'nonexistent',
        email: 'new@example.com'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(null);

      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('USER_NOT_FOUND');
      }
    });
  });

  describe('Duplicate Prevention', () => {
    it('should throw error when new username is taken by another user', async () => {
      const input = {
        userId: '5',
        username: 'takenusername'
      };

      const otherUser: User = {
        id: 10,
        username: 'takenusername',
        email: 'other@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(otherUser);

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
    });

    it('should throw error when new email is taken by another user', async () => {
      const input = {
        userId: '5',
        email: 'taken@example.com'
      };

      const otherUser: User = {
        id: 20,
        username: 'otheruser',
        email: 'taken@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(otherUser);

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });

    it('should not throw error if duplicate belongs to same user', async () => {
      const input = {
        userId: '5',
        username: 'originaluser', // Same user's own username
        email: 'original@example.com' // Same user's own email
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.update).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).resolves.not.toThrow();
    });
  });

  describe('Validation Errors', () => {
    it('should throw error for invalid username format', async () => {
      const input = {
        userId: '5',
        username: 'ab' // Too short
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid email format', async () => {
      const input = {
        userId: '5',
        email: 'not-an-email'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for weak password', async () => {
      const input = {
        userId: '5',
        password: 'weak'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).rejects.toThrow();
    });
  });

  describe('Partial Updates',() => {
    it('should not update fields that are not provided', async () => {
      const input = {
        userId: '5',
        username: 'onlyusername'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockImplementation(async (user) => user);

      await useCase.execute(input);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'onlyusername',
          email: 'original@example.com', // Unchanged
          passwordHash: 'original_hash' // Unchanged
        })
      );
    });

    it('should preserve user ID and createdAt', async () => {
      const input = {
        userId: '5',
        username: 'updated'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockImplementation(async (user) => user);

      await useCase.execute(input);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 5,
          createdAt: '2026-01-01T00:00:00.000Z'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate repository errors', async () => {
      const input = {
        userId: '5',
        username: 'newname'
      };

      vi.mocked(mockUserRepository.findById).mockRejectedValue(
        new Error('Database error')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Database error');
    });

    it('should handle password hashing failures', async () => {
      const input = {
        userId: '5',
        password: 'NewPassword123'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockPasswordHasher.hash).mockRejectedValue(
        new Error('Hashing failed')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Hashing failed');
    });

    it('should handle update failures', async () => {
      const input = {
        userId: '5',
        username: 'newname'
      };

      vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.update).mockRejectedValue(
        new Error('Update failed')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Update failed');
    });
  });
});
