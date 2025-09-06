/**
 * Secure Random Number Generator
 * Provides cryptographically secure random number generation
 */

import crypto from 'crypto';

/**
 * Generate cryptographically secure random bytes
 */
export function secureRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

/**
 * Generate secure random string
 */
export function secureRandomString(length: number, charset?: string): string {
  const defaultCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const chars = charset || defaultCharset;
  const bytes = secureRandomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

/**
 * Generate secure random number in range
 */
export function secureRandomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytes = secureRandomBytes(4);
  const randomValue = bytes.readUInt32BE(0);
  return min + (randomValue % range);
}

/**
 * Generate secure UUID v4
 */
export function secureUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate secure random password
 */
export function securePassword(length: number = 20): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  return secureRandomString(length, charset);
}
