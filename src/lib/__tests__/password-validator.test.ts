/**
 * Password Validator Tests
 * Comprehensive tests for password validation security
 */

import { validatePassword, generateSecurePassword, shouldChangePassword } from '../password-validator';

describe('Password Validator', () => {
  describe('validatePassword', () => {
    it('should accept valid strong passwords', () => {
      const result = validatePassword('StrongP@ssw0rd123!', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
      expect(result.entropy).toBeGreaterThan(80);
    });

    it('should reject passwords that are too short', () => {
      const result = validatePassword('Short1!', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 16 characters long');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePassword('lowercase123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePassword('UPPERCASE123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePassword('NoNumbers!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = validatePassword('NoSpecial123', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });

    it('should reject common passwords', () => {
      const result = validatePassword('password123', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common and easily guessable');
    });

    it('should reject passwords containing user information', () => {
      const result = validatePassword('TestUser123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain personal information');
    });

    it('should reject passwords with sequential characters', () => {
      const result = validatePassword('abc123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain sequential characters');
    });

    it('should reject passwords with repeated characters', () => {
      const result = validatePassword('aaa123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot have more than 2 consecutive identical characters');
    });

    it('should reject passwords with keyboard patterns', () => {
      const result = validatePassword('qwerty123!@#', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain keyboard patterns');
    });

    it('should reject passwords with low entropy', () => {
      const result = validatePassword('Aa1!', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password entropy is too low');
    });

    it('should reject passwords that are too long', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      const result = validatePassword(longPassword, {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be no more than 128 characters long');
    });

    it('should handle empty password', () => {
      const result = validatePassword('', {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 16 characters long');
    });

    it('should handle null password', () => {
      const result = validatePassword(null as any, {
        email: 'test@example.com',
        name: 'Test User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 16 characters long');
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password with default length', () => {
      const password = generateSecurePassword();
      
      expect(password).toHaveLength(20);
      expect(password).toMatch(/[A-Z]/); // Contains uppercase
      expect(password).toMatch(/[a-z]/); // Contains lowercase
      expect(password).toMatch(/[0-9]/); // Contains numbers
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/); // Contains special chars
    });

    it('should generate password with custom length', () => {
      const password = generateSecurePassword(30);
      
      expect(password).toHaveLength(30);
      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
      expect(password).toMatch(/[0-9]/);
      expect(password).toMatch(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/);
    });

    it('should generate different passwords each time', () => {
      const password1 = generateSecurePassword();
      const password2 = generateSecurePassword();
      
      expect(password1).not.toBe(password2);
    });
  });

  describe('shouldChangePassword', () => {
    it('should return true for old passwords', () => {
      const oldDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000); // 70 days ago
      const result = shouldChangePassword(oldDate);
      
      expect(result).toBe(true);
    });

    it('should return false for recent passwords', () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const result = shouldChangePassword(recentDate);
      
      expect(result).toBe(false);
    });

    it('should return true for passwords at expiry threshold', () => {
      const thresholdDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000); // 60 days ago
      const result = shouldChangePassword(thresholdDate);
      
      expect(result).toBe(true);
    });
  });

  describe('Password strength calculation', () => {
    it('should calculate correct strength levels', () => {
      const weakResult = validatePassword('weak123');
      const mediumResult = validatePassword('Medium123!');
      const strongResult = validatePassword('StrongP@ssw0rd123!');
      
      expect(weakResult.strength).toBe('weak');
      expect(mediumResult.strength).toBe('medium');
      expect(strongResult.strength).toBe('strong');
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in user info', () => {
      const result = validatePassword('Test-User123!@#', {
        email: 'test-user@example.com',
        name: 'Test-User'
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password cannot contain personal information');
    });

    it('should handle empty user info', () => {
      const result = validatePassword('ValidP@ssw0rd123!');
      
      expect(result.isValid).toBe(true);
    });

    it('should handle very long user info', () => {
      const longName = 'A'.repeat(100);
      const result = validatePassword('ValidP@ssw0rd123!', {
        email: 'test@example.com',
        name: longName
      });
      
      expect(result.isValid).toBe(true);
    });
  });
});
