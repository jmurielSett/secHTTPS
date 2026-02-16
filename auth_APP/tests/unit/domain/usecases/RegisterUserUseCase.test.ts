import { DomainError } from '@/domain/errors/DomainError';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IPasswordHasher } from '@/domain/services';
import { RegisterUserUseCase } from '@/domain/usecases/RegisterUserUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('RegisterUserUseCase', () => {
  let useCase: RegisterUserUseCase;
  let mockUserRepository: IUserRepository;
  let mockPasswordHasher: IPasswordHasher;

  beforeEach(() => {
    // Mock UserRepository
    mockUserRepository = {
      findByUsername: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      getUserRolesByApplication: vi.fn(),
      getAllUserRoles: vi.fn()
    } as any;

    // Mock PasswordHasher
    mockPasswordHasher = {
      hash: vi.fn(),
      compare: vi.fn()
    } as any;

    useCase = new RegisterUserUseCase(mockUserRepository, mockPasswordHasher);
  });

  describe('Successful Registration', () => {
    it('should register a new user successfully', async () => {
      const input = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123'
      };

      const hashedPassword = 'hashed_password_123';
      const createdUser: User = {
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
        passwordHash: hashedPassword,
        createdAt: '2026-02-15T10:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.create).mockResolvedValue(createdUser);

      const result = await useCase.execute(input);

      expect(result).toEqual({
        id: 1,
        username: 'newuser',
        email: 'newuser@example.com',
        passwordHash: undefined,
        createdAt: '2026-02-15T10:00:00.000Z'
      });
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('newuser');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('newuser@example.com');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('Password123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
          passwordHash: hashedPassword
        })
      );
    });

    it('should hash password before storing', async () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'PlainPassword123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed_password');
      vi.mocked(mockUserRepository.create).mockResolvedValue({
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        createdAt: '2026-02-15T10:00:00.000Z'
      });

      await useCase.execute(input);

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('PlainPassword123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed_password'
        })
      );
    });

    it('should not return password hash in response', async () => {
      const input = {
        username: 'user',
        email: 'user@example.com',
        password: 'Pass1234' // Ahora cumple mínimo 8 caracteres
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed');
      vi.mocked(mockUserRepository.create).mockResolvedValue({
        id: 1,
        username: 'user',
        email: 'user@example.com',
        passwordHash: 'hashed',
        createdAt: '2026-02-15T10:00:00.000Z'
      });

      const result = await useCase.execute(input);

      expect(result.passwordHash).toBeUndefined();
    });
  });

  describe('Validation Errors', () => {
    it('should throw error for invalid username format', async () => {
      const input = {
        username: 'ab', // Too short (minimum 3 characters)
        email: 'valid@example.com',
        password: 'Password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid email format', async () => {
      const input = {
        username: 'validuser',
        email: 'invalid-email', // Invalid format
        password: 'Password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for weak password', async () => {
      const input = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'weak' // Too short, no uppercase, no numbers
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });
  });

  describe('Duplicate Detection', () => {
    it('should throw DomainError when username already exists', async () => {
      const input = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123'
      };

      const existingUser: User = {
        id: 1,
        username: 'existinguser',
        email: 'existing@example.com',
        passwordHash: 'hash',
        createdAt: '2026-02-15T10:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
    });

    it('should throw DomainError when email already exists', async () => {
      const input = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'Password123'
      };

      const existingUser: User = {
        id: 1,
        username: 'anotheruser',
        email: 'existing@example.com',
        passwordHash: 'hash',
        createdAt: '2026-02-15T10:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });

    it('should check username before checking email', async () => {
      const input = {
        username: 'existinguser',
        email: 'existing@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue({
        id: 1,
        username: 'existinguser',
        email: 'other@example.com',
        passwordHash: 'hash',
        createdAt: '2026-02-15T10:00:00.000Z'
      });

      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
      
      // Should not check email if username already exists
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle repository errors gracefully', async () => {
      const input = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute(input)).rejects.toThrow('Database error');
    });

    it('should handle password hashing errors', async () => {
      const input = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockRejectedValue(new Error('Hashing failed'));

      await expect(useCase.execute(input)).rejects.toThrow('Hashing failed');
    });
  });
});
