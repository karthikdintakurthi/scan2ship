/**
 * Secure JWT Utilities
 * Provides secure JWT token generation and verification without fallback secrets
 */

import jwt from 'jsonwebtoken';

/**
 * Get JWT secret from environment variables
 * Throws error if not configured
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required but not configured');
  }
  
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long for security');
  }
  
  return secret;
}

/**
 * Generate a JWT token
 */
export function generateToken(payload: any, expiresIn: string = '24h'): string {
  try {
    const secret = getJwtSecret();
    return jwt.sign(payload, secret, { expiresIn });
  } catch (error) {
    console.error('Failed to generate JWT token:', error);
    throw new Error('Token generation failed');
  }
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): any {
  try {
    const secret = getJwtSecret();
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('Failed to verify JWT token:', error);
    throw new Error('Invalid or expired token');
  }
}

/**
 * Decode JWT token without verification (for debugging only)
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
    throw new Error('Invalid token format');
  }
}

/**
 * Check if JWT secret is properly configured
 */
export function isJwtSecretConfigured(): boolean {
  try {
    getJwtSecret();
    return true;
  } catch {
    return false;
  }
}
