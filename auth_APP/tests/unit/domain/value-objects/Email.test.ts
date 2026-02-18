import { Email } from '@/domain/value-objects/Email';
import { describe, expect, it } from 'vitest';

describe('Email Value Object', () => {
  describe('Valid emails', () => {
    it.each([
      'user@example.com',
      'admin@auth.com',
      'first.last@subdomain.domain.org',
      'user+tag@example.co.uk',
      '  user@example.com  ', // trims whitespace
    ])('should create email for "%s"', (input) => {
      const email = Email.create(input);
      expect(email.getValue()).toBe(input.trim().toLowerCase());
    });

    it('should normalise email to lowercase', () => {
      const email = Email.create('User@EXAMPLE.COM');
      expect(email.getValue()).toBe('user@example.com');
    });
  });

  describe('Invalid emails', () => {
    it.each([
      ['', 'Email cannot be empty'],
      ['   ', 'Email cannot be empty'],
      ['notanemail', 'Invalid email format'],
      ['missing@tld', 'Invalid email format'],
      ['@nodomain.com', 'Invalid email format'],
      ['spaces in@email.com', 'Invalid email format'],
    ])('should throw for "%s"', (input, expectedMessage) => {
      expect(() => Email.create(input)).toThrow(expectedMessage);
    });

    it('should throw for email exceeding 255 characters', () => {
      const longEmail = 'a'.repeat(250) + '@x.com';
      expect(() => Email.create(longEmail)).toThrow('Email is too long');
    });
  });

  describe('equals()', () => {
    it('should return true for identical emails', () => {
      const a = Email.create('user@example.com');
      const b = Email.create('user@example.com');
      expect(a.equals(b)).toBe(true);
    });

    it('should return true regardless of original casing', () => {
      const a = Email.create('USER@EXAMPLE.COM');
      const b = Email.create('user@example.com');
      expect(a.equals(b)).toBe(true);
    });

    it('should return false for different emails', () => {
      const a = Email.create('alice@example.com');
      const b = Email.create('bob@example.com');
      expect(a.equals(b)).toBe(false);
    });
  });

  describe('toString()', () => {
    it('should return the normalised email string', () => {
      const email = Email.create('User@Example.COM');
      expect(email.toString()).toBe('user@example.com');
    });
  });
});
