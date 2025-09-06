/**
 * Persistent Rate Limiter
 * Uses database for rate limiting to prevent bypass on server restart
 */

import { prisma } from './prisma';
import { NextRequest } from 'next/server';

// Rate limiting configuration
const rateLimitConfig = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  webhook: { windowMs: 60 * 1000, maxRequests: 20 }
};

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  remaining?: number;
  resetTime?: number;
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from JWT token first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      // Simple token check without full JWT verification
      if (token.length > 10) {
        return `user:${token.substring(0, 8)}`;
      }
    } catch (error) {
      // Fall back to IP address
    }
  }
  
  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Clean up expired rate limit entries
 */
async function cleanupExpiredEntries(): Promise<void> {
  try {
    const now = new Date();
    await prisma.rate_limits.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
  } catch (error) {
    console.error('❌ Error cleaning up expired rate limit entries:', error);
  }
}

/**
 * Persistent rate limiting
 */
export async function rateLimit(
  request: NextRequest,
  type: keyof typeof rateLimitConfig = 'api'
): Promise<RateLimitResult> {
  const config = rateLimitConfig[type];
  const now = new Date();
  const windowStart = new Date(now.getTime() - config.windowMs);
  
  // Get client identifier
  const clientId = getClientIdentifier(request);
  const key = `${type}:${clientId}`;
  
  try {
    // Clean up expired entries periodically (10% chance)
    if (Math.random() < 0.1) {
      await cleanupExpiredEntries();
    }
    
    // Get current rate limit data
    const existing = await prisma.rate_limits.findUnique({
      where: { key }
    });
    
    if (!existing) {
      // Create new entry
      await prisma.rate_limits.create({
        data: {
          key,
          count: 1,
          windowStart,
          expiresAt: new Date(now.getTime() + config.windowMs)
        }
      });
      
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1,
        resetTime: now.getTime() + config.windowMs
      };
    }
    
    // Check if window has expired
    if (existing.windowStart < windowStart) {
      // Reset window
      await prisma.rate_limits.update({
        where: { key },
        data: {
          count: 1,
          windowStart,
          expiresAt: new Date(now.getTime() + config.windowMs)
        }
      });
      
      return { 
        allowed: true, 
        remaining: config.maxRequests - 1,
        resetTime: now.getTime() + config.windowMs
      };
    }
    
    // Check if limit exceeded
    if (existing.count >= config.maxRequests) {
      const resetTime = existing.expiresAt.getTime();
      const timeUntilReset = Math.ceil((resetTime - now.getTime()) / 1000);
      
      return {
        allowed: false,
        message: `Too many requests. Please try again in ${timeUntilReset} seconds.`,
        remaining: 0,
        resetTime
      };
    }
    
    // Increment count
    await prisma.rate_limits.update({
      where: { key },
      data: {
        count: existing.count + 1
      }
    });
    
    return { 
      allowed: true, 
      remaining: config.maxRequests - existing.count - 1,
      resetTime: existing.expiresAt.getTime()
    };
    
  } catch (error) {
    console.error('❌ Rate limiting error:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
  }
}

/**
 * Get rate limit status for a client
 */
export async function getRateLimitStatus(
  request: NextRequest,
  type: keyof typeof rateLimitConfig = 'api'
): Promise<{ count: number; limit: number; remaining: number; resetTime: number }> {
  const config = rateLimitConfig[type];
  const clientId = getClientIdentifier(request);
  const key = `${type}:${clientId}`;
  
  try {
    const existing = await prisma.rate_limits.findUnique({
      where: { key }
    });
    
    if (!existing) {
      return {
        count: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: Date.now() + config.windowMs
      };
    }
    
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);
    
    if (existing.windowStart < windowStart) {
      return {
        count: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now.getTime() + config.windowMs
      };
    }
    
    return {
      count: existing.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - existing.count),
      resetTime: existing.expiresAt.getTime()
    };
  } catch (error) {
    console.error('❌ Error getting rate limit status:', error);
    return {
      count: 0,
      limit: config.maxRequests,
      remaining: config.maxRequests,
      resetTime: Date.now() + config.windowMs
    };
  }
}

/**
 * Reset rate limit for a client (admin function)
 */
export async function resetRateLimit(
  clientId: string,
  type?: keyof typeof rateLimitConfig
): Promise<boolean> {
  try {
    const whereClause: any = {
      key: {
        startsWith: type ? `${type}:` : undefined
      }
    };
    
    if (type) {
      whereClause.key = `${type}:${clientId}`;
    } else {
      whereClause.key = {
        contains: clientId
      };
    }
    
    await prisma.rate_limits.deleteMany({
      where: whereClause
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error resetting rate limit:', error);
    return false;
  }
}
