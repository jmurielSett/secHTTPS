import { Username } from '@/domain/value-objects/Username';
import { describe, expect, it } from 'vitest';

describe('Username Value Object', () => {
  describe('Valid usernames', () => {
    it.each([
      'admin',
      'john_doe',
      'user-123',
      'ABC',
      'a1b2c3',
      '  trimmed  ', // leading/trailing spaces are trimmed
    ])('should create username for "%s"', (input) => {
      expect(() => Username.create(input)).not.toThrow();
    });

    it('should preserve the original casing', () => {
      const u = Username.create('AdminUser');
      expect(u.getValue()).toBe('AdminUser');
    });

    it('should trim leading/trailing spaces', () => {
      const u = Username.create('  admin  ');
      expect(u.getValue()).toBe('admin');
    });
  });

  describe('Invalid usernames', () => {
    it.each([
      ['', 'Username cannot be empty'],
      ['   ', 'Username cannot be empty'],
      ['ab', 'Username must be at least 3 characters'],
      ['has space', 'Username can only contain letters'],
      ['invalid!', 'Username can only contain letters'],
      ['dot.in.name', 'Username can only contain letters'],
    ])('should throw for "%s"', (input, expectedFragment) => {
      expect(() => Username.create(input)).toThrow(expectedFragment);
    });

    it('should throw for username exceeding 50 characters', () => {
      expect(() => Username.create('a'.repeat(51))).toThrow(
        'Username cannot exceed 50 characters'
      );
    });
  });

  describe('equals()', () => {
    it('should return true for identical usernames', () => {
      const a = Username.create('admin');
      const b = Username.create('admin');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different usernames', () => {
      const a = Username.create('alice');
      const b = Username.create('bob');
      expect(a.equals(b)).toBe(false);
    });

    it('should be case-sensitive', () => {
      const a = Username.create('Admin');
      const b = Username.create('admin');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the username value', () => {
      const u = Username.create('admin');
      expect(u.toString()).toBe('admin');
    });
  });
});
