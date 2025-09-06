/**
 * CSRF Protection System
 * Provides Cross-Site Request Forgery protection
 */

import { secureRandomBytes } from './secure-random';
import { prisma } from './prisma';
import crypto from 'crypto';

interface CSRFToken {
  token: string;
  expiresAt: Date;
  userId?: string;
  sessionId?: string;
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return secureRandomBytes(32).toString('hex');
}

/**
 * Create and store CSRF token
 */
export async function createCSRFToken(
  userId?: string,
  sessionId?: string,
  expiresInMinutes: number = 30
): Promise<string> {
  const token = generateCSRFToken();
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
  
  try {
    await prisma.csrf_tokens.create({
      data: {
        id: crypto.randomUUID(),
        token,
        userId,
        sessionId,
        expiresAt,
        createdAt: new Date()
      }
    });
    
    return token;
  } catch (error) {
    console.error('❌ Failed to create CSRF token:', error);
    throw new Error('Failed to create CSRF token');
  }
}

/**
 * Validate CSRF token
 */
export async function validateCSRFToken(
  token: string,
  userId?: string,
  sessionId?: string
): Promise<boolean> {
  try {
    const csrfToken = await prisma.csrf_tokens.findFirst({
      where: {
        token,
        userId: userId || undefined,
        sessionId: sessionId || undefined,
        expiresAt: { gt: new Date() }
      }
    });
    
    if (!csrfToken) {
      return false;
    }
    
    // Delete token after use (one-time use)
    await prisma.csrf_tokens.delete({
      where: { id: csrfToken.id }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to validate CSRF token:', error);
    return false;
  }
}

/**
 * Clean up expired CSRF tokens
 */
export async function cleanupExpiredCSRFTokens(): Promise<number> {
  try {
    const result = await prisma.csrf_tokens.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('❌ Failed to cleanup CSRF tokens:', error);
    return 0;
  }
}
