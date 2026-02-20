import { DomainError } from '@/domain/errors/DomainError';
import { IUserRepository } from '@/domain/repositories/IUserRepository';
import { IPasswordHasher } from '@/domain/services';
import { CreateUserUseCase } from '@/domain/usecases/CreateUserUseCase';
import { User } from '@/types/user';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
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

    useCase = new CreateUserUseCase(mockUserRepository, mockPasswordHasher);
  });

  describe('Successful User Creation', () => {
    it('should create a new user successfully', async () => {
      const input = {
        username: 'adminuser',
        email: 'admin@example.com',
        password: 'AdminPass123'
      };

      const hashedPassword = 'hashed_admin_pass';
      const createdUser: User = {
        id: 5,
        username: 'adminuser',
        email: 'admin@example.com',
        passwordHash: hashedPassword,
        createdAt: '2026-02-15T12:00:00.000Z'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.create).mockResolvedValue(createdUser);

      const result = await useCase.execute(input);

      expect(result).toEqual({
        id: 5,
        username: 'adminuser',
        email: 'admin@example.com',
        passwordHash: undefined,
        createdAt: '2026-02-15T12:00:00.000Z'
      });
      expect(mockUserRepository.findByUsername).toHaveBeenCalledWith('adminuser');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('AdminPass123');
    });

    it('should not return password hash in response', async () => {
      const input = {
        username: 'manager',
        email: 'manager@example.com',
        password: 'Manager123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed');
      vi.mocked(mockUserRepository.create).mockResolvedValue({
        id: 10,
        username: 'manager',
        email: 'manager@example.com',
        passwordHash: 'hashed',
        createdAt: '2026-02-15T12:00:00.000Z'
      });

      const result = await useCase.execute(input);

      expect(result.passwordHash).toBeUndefined();
      expect(result).not.toHaveProperty('passwordHash', 'hashed');
    });

    it('should hash password before storing', async () => {
      const input = {
        username: 'editor',
        email: 'editor@example.com',
        password: 'EditorPass123'
      };

      const hashedPassword = 'super_secure_hash';

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue(hashedPassword);
      vi.mocked(mockUserRepository.create).mockResolvedValue({
        id: 15,
        username: 'editor',
        email: 'editor@example.com',
        passwordHash: hashedPassword,
        createdAt: '2026-02-15T12:00:00.000Z'
      });

      await useCase.execute(input);

      expect(mockPasswordHasher.hash).toHaveBeenCalledWith('EditorPass123');
      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: hashedPassword
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should throw error for invalid username (too short)', async () => {
      const input = {
        username: 'ab',
        email: 'valid@example.com',
        password: 'Password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid username (invalid characters)', async () => {
      const input = {
        username: 'user!invalid',
        email: 'valid@example.com',
        password: 'Password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for invalid email format', async () => {
      const input = {
        username: 'validuser',
        email: 'not-an-email',
        password: 'Password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for weak password (too short)', async () => {
      const input = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'pass'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for weak password (no uppercase)', async () => {
      const input = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'password123'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });

    it('should throw error for weak password (no numbers)', async () => {
      const input = {
        username: 'validuser',
        email: 'valid@example.com',
        password: 'Password'
      };

      await expect(useCase.execute(input)).rejects.toThrow();
    });
  });

  describe('Duplicate Prevention', () => {
    it('should throw DomainError when username already exists', async () => {
      const input = {
        username: 'duplicate',
        email: 'unique@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue({
        id: 99,
        username: 'duplicate',
        email: 'other@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
    });

    it('should throw DomainError with correct code for duplicate username', async () => {
      const input = {
        username: 'existing',
        email: 'new@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue({
        id: 1,
        username: 'existing',
        email: 'old@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('DUPLICATE_USERNAME');
      }
    });

    it('should throw DomainError when email already exists', async () => {
      const input = {
        username: 'uniqueuser',
        email: 'duplicate@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
        id: 88,
        username: 'otheruser',
        email: 'duplicate@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      await expect(useCase.execute(input)).rejects.toThrow(DomainError);
      await expect(useCase.execute(input)).rejects.toThrow('Email already exists');
    });

    it('should throw DomainError with correct code for duplicate email', async () => {
      const input = {
        username: 'newuser',
        email: 'taken@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue({
        id: 77,
        username: 'another',
        email: 'taken@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      try {
        await useCase.execute(input);
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe('DUPLICATE_EMAIL');
      }
    });

    it('should check username before email to fail fast', async () => {
      const input = {
        username: 'taken',
        email: 'also_taken@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue({
        id: 1,
        username: 'taken',
        email: 'different@example.com',
        passwordHash: 'hash',
        createdAt: '2026-01-01T00:00:00.000Z'
      });

      await expect(useCase.execute(input)).rejects.toThrow('Username already exists');
      
      // Should not check email if username check fails
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should propagate repository errors', async () => {
      const input = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockRejectedValue(
        new Error('Database connection lost')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Database connection lost');
    });

    it('should handle password hashing failures', async () => {
      const input = {
        username: 'user123',
        email: 'user@example.com',
        password: 'ValidPass123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockRejectedValue(
        new Error('Hashing algorithm failed')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Hashing algorithm failed');
    });

    it('should handle repository create failures', async () => {
      const input = {
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123'
      };

      vi.mocked(mockUserRepository.findByUsername).mockResolvedValue(null);
      vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(mockPasswordHasher.hash).mockResolvedValue('hashed');
      vi.mocked(mockUserRepository.create).mockRejectedValue(
        new Error('Insert failed')
      );

      await expect(useCase.execute(input)).rejects.toThrow('Insert failed');
    });
  });
});
