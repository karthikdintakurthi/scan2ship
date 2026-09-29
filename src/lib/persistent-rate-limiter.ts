/**
 * Persistent Rate Limiter
 * Uses database for rate limiting to prevent bypass on server restart
 */

import { prisma } from './prisma';
import { NextRequest } from 'next/server';
import { createHash } from 'crypto';

// Rate limiting configuration
const rateLimitConfig = {
  auth: { windowMs: 15 * 60 * 1000, maxRequests: 5 },
  api: { windowMs: 15 * 60 * 1000, maxRequests: 100 },
  upload: { windowMs: 15 * 60 * 1000, maxRequests: 10 },
  webhook: { windowMs: 60 * 1000, maxRequests: 120 },
  // Unauthenticated phone-number lookups; always keyed by IP
  tracking: { windowMs: 15 * 60 * 1000, maxRequests: 10 }
};

interface RateLimitResult {
  allowed: boolean;
  message?: string;
  remaining?: number;
  resetTime?: number;
}

function bearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

/**
 * Read userId/sub from a JWT payload without verifying the signature. Used only
 * to pick a rate-limit bucket; authorization still happens separately.
 */
function jwtSubject(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      userId?: unknown;
      sub?: unknown;
    };
    const id = payload.userId ?? payload.sub;
    return typeof id === 'string' && id.length > 0 && id.length <= 128 ? id : null;
  } catch {
    return null;
  }
}

function tokenFingerprint(token: string): string {
  return createHash('sha256').update(token).digest('hex').slice(0, 16);
}

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(request: NextRequest, type: keyof typeof rateLimitConfig): string {
  // Public and auth endpoints must not let a caller pick its bucket with a token
  if (type === 'tracking' || type === 'auth' || type === 'webhook') {
    return `ip:${getClientIp(request)}`;
  }

  const token = bearerToken(request);
  if (token) {
    const userId = jwtSubject(token);
    if (userId) return `user:${userId}`;
    return `key:${tokenFingerprint(token)}`;
  }

  return `ip:${getClientIp(request)}`;
}

/**
 * The client IP as set by the hosting proxy: x-real-ip, else the first
 * x-forwarded-for entry (later entries are proxies).
 */
export function getClientIp(request: NextRequest): string {
  const realIp = request.headers.get('x-real-ip')?.trim();
  if (realIp) return realIp;
  const firstForwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return firstForwarded || 'unknown';
}

/**
 * Fixed-window limit with one atomic increment per request. Fails open if the
 * store is unavailable, like rateLimit below.
 */
export async function consumeFixedWindow(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
  const now = new Date();
  try {
    const row = await prisma.rate_limits.upsert({
      where: { key },
      create: {
        id: `rate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        key,
        count: 1,
        windowStart: now,
        expiresAt: new Date(now.getTime() + windowMs),
        updatedAt: now
      },
      update: { count: { increment: 1 }, updatedAt: now }
    });

    if (row.windowStart.getTime() + windowMs <= now.getTime()) {
      // Window over: start a new one. Conditional so concurrent requests reset it once.
      await prisma.rate_limits.updateMany({
        where: { key, windowStart: row.windowStart },
        data: { count: 1, windowStart: now, expiresAt: new Date(now.getTime() + windowMs), updatedAt: now }
      });
      return { allowed: true, remaining: maxRequests - 1, resetTime: now.getTime() + windowMs };
    }

    const resetTime = row.windowStart.getTime() + windowMs;
    if (row.count > maxRequests) {
      return {
        allowed: false,
        message: `Too many requests. Please try again in ${Math.ceil((resetTime - now.getTime()) / 1000)} seconds.`,
        remaining: 0,
        resetTime
      };
    }
    return { allowed: true, remaining: maxRequests - row.count, resetTime };
  } catch (error) {
    console.error('❌ Fixed-window rate limit error:', error);
    return { allowed: true, remaining: maxRequests, resetTime: now.getTime() + windowMs };
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
  const key = `${type}:${getClientIdentifier(request, type)}`;
  return consumeFixedWindow(key, config.windowMs, config.maxRequests);
}

/**
 * Get rate limit status for a client
 */
export async function getRateLimitStatus(
  request: NextRequest,
  type: keyof typeof rateLimitConfig = 'api'
): Promise<{ count: number; limit: number; remaining: number; resetTime: number }> {
  const config = rateLimitConfig[type];
  const clientId = getClientIdentifier(request, type);
  const key = `${type}:${clientId}`;
  
  try {
    const existing = await prisma.rate_limits.findFirst({
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
    const whereClause: any = {};
    
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
