/**
 * Password Policy Enforcement
 * Implements comprehensive password security requirements
 */

import crypto from 'crypto';

// Password policy configuration
export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
  preventSequentialChars: boolean;
  preventRepeatingChars: boolean;
  preventPersonalInfo: boolean;
  maxAgeDays: number;
  historyCount: number;
}

// Default password policy (enterprise-grade)
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventSequentialChars: true,
  preventRepeatingChars: true,
  preventPersonalInfo: true,
  maxAgeDays: 90,
  historyCount: 5
};

// Common weak passwords to prevent
export const COMMON_PASSWORDS = [
  'password', '123456', '123456789', 'qwerty', 'abc123',
  'password123', 'admin', 'letmein', 'welcome', 'monkey',
  'dragon', 'master', 'sunshine', 'princess', 'shadow',
  'baseball', 'football', 'basketball', 'superman', 'batman',
  'spiderman', 'ironman', 'captain', 'avenger', 'marvel',
  'starwars', 'harrypotter', 'lordoftherings', 'gameofthrones',
  'breakingbad', 'friends', 'seinfeld', 'simpsons', 'familyguy'
];

// Sequential character patterns
export const SEQUENTIAL_PATTERNS = [
  'abcdefghijklmnopqrstuvwxyz',
  'zyxwvutsrqponmlkjihgfedcba',
  'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  'ZYXWVUTSRQPONMLKJIHGFEDCBA',
  '0123456789',
  '9876543210',
  'qwertyuiop',
  'asdfghjkl',
  'zxcvbnm'
];

// Personal information patterns
export const PERSONAL_INFO_PATTERNS = [
  /(?:19|20)\d{2}/, // Years
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /\b\d{5}(?:[-\s]\d{4})?\b/, // ZIP codes
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i, // Month names
  /\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i // Day names
];

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  score: number; // 0-100
}

/**
 * Validate password against policy
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
  userInfo?: { email?: string; name?: string; phone?: string }
): PasswordValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let score = 0;

  // Basic length validation
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters long`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`Password must not exceed ${policy.maxLength} characters`);
  }

  // Character type requirements
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  // Prevent common passwords
  if (policy.preventCommonPasswords && COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common and easily guessable');
  }

  // Prevent sequential characters
  if (policy.preventSequentialChars) {
    for (const pattern of SEQUENTIAL_PATTERNS) {
      if (pattern.includes(password.toLowerCase()) || pattern.includes(password.toUpperCase())) {
        errors.push('Password contains sequential characters');
        break;
      }
    }
  }

  // Prevent repeating characters
  if (policy.preventRepeatingChars) {
    const repeatingPattern = /(.)\1{2,}/;
    if (repeatingPattern.test(password)) {
      errors.push('Password contains too many repeating characters');
    }
  }

  // Prevent personal information
  if (policy.preventPersonalInfo && userInfo) {
    const personalInfo = [
      userInfo.email?.split('@')[0],
      userInfo.name?.toLowerCase(),
      userInfo.phone?.replace(/\D/g, '')
    ].filter(Boolean);

    for (const info of personalInfo) {
      if (info && password.toLowerCase().includes(info.toLowerCase())) {
        errors.push('Password contains personal information');
        break;
      }
    }

    // Check for common patterns
    for (const pattern of PERSONAL_INFO_PATTERNS) {
      if (pattern.test(password)) {
        warnings.push('Password may contain personal information patterns');
        break;
      }
    }
  }

  // Calculate strength score
  score = calculatePasswordStrength(password, policy);

  // Determine strength level
  let strength: 'weak' | 'medium' | 'strong' | 'very_strong';
  if (score < 30) strength = 'weak';
  else if (score < 60) strength = 'medium';
  else if (score < 80) strength = 'strong';
  else strength = 'very_strong';

  // Add warnings for weak passwords
  if (score < 50) {
    warnings.push('Consider using a stronger password');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
    score
  };
}

/**
 * Calculate password strength score (0-100)
 */
function calculatePasswordStrength(password: string, policy: PasswordPolicy): number {
  let score = 0;

  // Length contribution (up to 25 points)
  score += Math.min(25, password.length * 2);

  // Character variety contribution (up to 25 points)
  let charVariety = 0;
  if (/[a-z]/.test(password)) charVariety++;
  if (/[A-Z]/.test(password)) charVariety++;
  if (/\d/.test(password)) charVariety++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) charVariety++;
  score += charVariety * 6.25;

  // Complexity contribution (up to 25 points)
  const uniqueChars = new Set(password).size;
  score += Math.min(25, uniqueChars * 2);

  // Entropy contribution (up to 25 points)
  const entropy = calculateEntropy(password);
  score += Math.min(25, entropy / 4);

  return Math.min(100, Math.round(score));
}

/**
 * Calculate password entropy
 */
function calculateEntropy(password: string): number {
  const charSet = new Set(password);
  const charsetSize = charSet.size;
  return Math.log2(Math.pow(charsetSize, password.length));
}

/**
 * Generate secure random password
 */
export function generateSecurePassword(
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): string {
  const charset = {
    lowercase: 'abcdefghijklmnopqrstuvwxyz',
    uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    numbers: '0123456789',
    special: '!@#$%^&*()_+-=[]{}|;:,.<>?'
  };

  let password = '';
  const requiredChars: string[] = [];

  // Add required character types
  if (policy.requireLowercase) {
    const char = charset.lowercase[Math.floor(Math.random() * charset.lowercase.length)];
    requiredChars.push(char);
    password += char;
  }

  if (policy.requireUppercase) {
    const char = charset.uppercase[Math.floor(Math.random() * charset.uppercase.length)];
    requiredChars.push(char);
    password += char;
  }

  if (policy.requireNumbers) {
    const char = charset.numbers[Math.floor(Math.random() * charset.numbers.length)];
    requiredChars.push(char);
    password += char;
  }

  if (policy.requireSpecialChars) {
    const char = charset.special[Math.floor(Math.random() * charset.special.length)];
    requiredChars.push(char);
    password += char;
  }

  // Fill remaining length with random characters
  const allChars = charset.lowercase + charset.uppercase + charset.numbers + charset.special;
  const remainingLength = policy.minLength - requiredChars.length;

  for (let i = 0; i < remainingLength; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Hash password with salt
 */
export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(salt + ':' + derivedKey.toString('hex'));
    });
  });
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(key === derivedKey.toString('hex'));
    });
  });
}

/**
 * Check if password needs renewal
 */
export function shouldRenewPassword(
  lastPasswordChange: Date,
  maxAgeDays: number = DEFAULT_PASSWORD_POLICY.maxAgeDays
): boolean {
  const now = new Date();
  const daysSinceChange = (now.getTime() - lastPasswordChange.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceChange > maxAgeDays;
}

/**
 * Get password expiration date
 */
export function getPasswordExpirationDate(
  lastPasswordChange: Date,
  maxAgeDays: number = DEFAULT_PASSWORD_POLICY.maxAgeDays
): Date {
  return new Date(lastPasswordChange.getTime() + (maxAgeDays * 24 * 60 * 60 * 1000));
}
