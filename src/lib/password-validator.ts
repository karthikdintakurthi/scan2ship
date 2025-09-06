/**
 * Enhanced Password Validator
 * Implements comprehensive password security policies
 */

import { securityConfig } from './security-config';
import crypto from 'crypto';

interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  entropy: number;
}

interface PasswordHistoryEntry {
  password: string;
  createdAt: Date;
}

/**
 * Common weak passwords to check against
 */
const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
  'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'password1',
  'qwerty123', 'dragon', 'master', 'hello', 'freedom', 'whatever',
  'qazwsx', 'trustno1', 'dragon', 'master', 'hello', 'freedom',
  'whatever', 'qazwsx', 'trustno1', '654321', 'jordan23', 'harley',
  'password1', 'jordan', 'jennifer', 'zxcvbnm', 'asdfgh', 'qwertyuiop',
  '123qwe', 'michael', 'mustang', 'access', 'shadow', 'superman',
  'qazwsx', 'michael', 'jordan', 'harley', 'ranger', 'jennifer',
  'hunter', 'buster', 'soccer', 'hockey', 'killer', 'george',
  'sexy', 'andrew', 'charlie', 'superman', 'asshole', 'fuckyou',
  'dallas', 'jessica', 'panties', 'pepper', '1234', '12345',
  '123456', '1234567', '12345678', '123456789', '1234567890'
];

/**
 * Keyboard patterns to detect
 */
const KEYBOARD_PATTERNS = [
  'qwerty', 'asdfgh', 'zxcvbn', 'qwertyuiop', 'asdfghjkl',
  'zxcvbnm', 'qwertyuiopasdfghjklzxcvbnm', '1234567890',
  'abcdefghijklmnopqrstuvwxyz', 'qwertyuiopasdfghjkl',
  'asdfghjklqwertyuiop', 'zxcvbnmasdfghjklqwertyuiop'
];

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  const charset = new Set(password.split(''));
  let charsetSize = 0;
  
  // Determine character set size
  if (/[a-z]/.test(password)) charsetSize += 26;
  if (/[A-Z]/.test(password)) charsetSize += 26;
  if (/[0-9]/.test(password)) charsetSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) charsetSize += 32; // Special chars
  
  return Math.log2(Math.pow(charsetSize, password.length));
}

/**
 * Check if password contains user information
 */
function containsUserInfo(password: string, userInfo: { email?: string; name?: string; username?: string }): boolean {
  const lowerPassword = password.toLowerCase();
  
  if (userInfo.email) {
    const emailParts = userInfo.email.toLowerCase().split('@')[0].split('.');
    for (const part of emailParts) {
      if (part.length > 2 && lowerPassword.includes(part)) {
        return true;
      }
    }
  }
  
  if (userInfo.name) {
    const nameParts = userInfo.name.toLowerCase().split(' ');
    for (const part of nameParts) {
      if (part.length > 2 && lowerPassword.includes(part)) {
        return true;
      }
    }
  }
  
  if (userInfo.username) {
    const username = userInfo.username.toLowerCase();
    if (username.length > 2 && lowerPassword.includes(username)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for sequential characters
 */
function hasSequentialChars(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  for (let i = 0; i < lowerPassword.length - 2; i++) {
    const char1 = lowerPassword.charCodeAt(i);
    const char2 = lowerPassword.charCodeAt(i + 1);
    const char3 = lowerPassword.charCodeAt(i + 2);
    
    if (char2 === char1 + 1 && char3 === char2 + 1) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check for repeated characters
 */
function hasRepeatedChars(password: string, maxConsecutive: number): boolean {
  let currentChar = '';
  let count = 0;
  
  for (const char of password) {
    if (char === currentChar) {
      count++;
      if (count > maxConsecutive) {
        return true;
      }
    } else {
      currentChar = char;
      count = 1;
    }
  }
  
  return false;
}

/**
 * Check for keyboard patterns
 */
function hasKeyboardPatterns(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  
  for (const pattern of KEYBOARD_PATTERNS) {
    if (lowerPassword.includes(pattern)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if password is in common passwords list
 */
function isCommonPassword(password: string): boolean {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.includes(lowerPassword);
}

/**
 * Check password against history
 */
function isPasswordInHistory(password: string, history: PasswordHistoryEntry[]): boolean {
  const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
  
  return history.some(entry => {
    const hashedEntry = crypto.createHash('sha256').update(entry.password).digest('hex');
    return hashedEntry === hashedPassword;
  });
}

/**
 * Calculate password strength
 */
function calculateStrength(entropy: number, errors: string[]): 'weak' | 'medium' | 'strong' | 'very-strong' {
  if (errors.length > 0) return 'weak';
  
  if (entropy < 50) return 'weak';
  if (entropy < 70) return 'medium';
  if (entropy < 90) return 'strong';
  return 'very-strong';
}

/**
 * Validate password against enhanced security policies
 */
export function validatePassword(
  password: string,
  userInfo?: { email?: string; name?: string; username?: string },
  history?: PasswordHistoryEntry[]
): PasswordValidationResult {
  const errors: string[] = [];
  const config = securityConfig.password;
  
  // Length validation
  if (password.length < config.minLength) {
    errors.push(`Password must be at least ${config.minLength} characters long`);
  }
  
  if (password.length > config.maxLength) {
    errors.push(`Password must be no more than ${config.maxLength} characters long`);
  }
  
  // Character requirements
  if (config.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (config.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (config.requireNumbers && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (config.requireSpecialChars && !/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  // Security checks
  if (config.preventCommonPasswords && isCommonPassword(password)) {
    errors.push('Password is too common and easily guessable');
  }
  
  if (config.preventUserInfo && userInfo && containsUserInfo(password, userInfo)) {
    errors.push('Password cannot contain personal information');
  }
  
  if (config.preventSequentialChars && hasSequentialChars(password)) {
    errors.push('Password cannot contain sequential characters');
  }
  
  if (config.preventRepeatedChars && hasRepeatedChars(password, config.maxConsecutiveChars)) {
    errors.push(`Password cannot have more than ${config.maxConsecutiveChars} consecutive identical characters`);
  }
  
  if (config.preventKeyboardPatterns && hasKeyboardPatterns(password)) {
    errors.push('Password cannot contain keyboard patterns');
  }
  
  if (config.preventLeakedPasswords && isCommonPassword(password)) {
    errors.push('Password has been found in data breaches');
  }
  
  if (config.preventSimilarPasswords && history && isPasswordInHistory(password, history)) {
    errors.push('Password cannot be similar to previous passwords');
  }
  
  // Calculate entropy
  const entropy = calculateEntropy(password);
  
  if (config.minEntropy && entropy < config.minEntropy) {
    errors.push(`Password entropy is too low (${entropy.toFixed(1)} < ${config.minEntropy})`);
  }
  
  // Check unique characters
  const uniqueChars = new Set(password.split('')).size;
  if (config.minUniqueChars && uniqueChars < config.minUniqueChars) {
    errors.push(`Password must contain at least ${config.minUniqueChars} unique characters`);
  }
  
  const strength = calculateStrength(entropy, errors);
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
    entropy
  };
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 20): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  
  // Ensure at least one character from each required category
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*()_+-=[]{}|;:,.<>?'[Math.floor(Math.random() * 32)];
  
  // Fill the rest with random characters
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Check if password needs to be changed
 */
export function shouldChangePassword(lastChanged: Date): boolean {
  const config = securityConfig.password;
  const now = new Date();
  const daysSinceChange = (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24);
  
  return daysSinceChange > (config.maxAge / (1000 * 60 * 60 * 24));
}
