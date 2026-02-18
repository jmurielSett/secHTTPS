import { Password } from '@/domain/value-objects/Password';
import { describe, expect, it } from 'vitest';

describe('Password Value Object', () => {
  describe('Valid passwords', () => {
    it.each([
      'Admin123',
      'P@ssword1',
      'Abcdef1234',
      'MyS3cur3Pass',
    ])('should create password for "%s"', (input) => {
      expect(() => Password.create(input)).not.toThrow();
    });

    it('should preserve the original value', () => {
      const pass = Password.create('Admin123');
      expect(pass.getValue()).toBe('Admin123');
    });
  });

  describe('Invalid passwords', () => {
    it.each([
      ['', 'Password cannot be empty'],
      ['Short1', 'Password must be at least 8 characters'],
      ['alllowercase1', 'Password must contain at least one uppercase letter'],
      ['ALLUPPERCASE1', 'Password must contain at least one uppercase letter'],
      ['NoNumbers!', 'Password must contain at least one uppercase letter'],
    ])('should throw for "%s"', (input, expectedFragment) => {
      expect(() => Password.create(input)).toThrow(expectedFragment);
    });

    it('should throw for password exceeding 100 characters', () => {
      const longPass = 'Aa1' + 'b'.repeat(100);
      expect(() => Password.create(longPass)).toThrow('Password cannot exceed 100 characters');
    });

    it('should throw if no uppercase letter', () => {
      expect(() => Password.create('password1')).toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should throw if no lowercase letter', () => {
      expect(() => Password.create('PASSWORD1')).toThrow(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should throw if no number', () => {
      expect(() => Password.create('Passwordonly')).toThrow(
        'Password must contain at least one uppercase letter'
      );
    });
  });

  describe('toString()', () => {
    it('should never expose the real password value', () => {
      const pass = Password.create('Admin123');
      expect(pass.toString()).toBe('********');
      expect(pass.toString()).not.toContain('Admin123');
    });
  });
});
