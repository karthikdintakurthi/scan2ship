/**
 * Enhanced Session Management System
 * Provides secure session handling with advanced security features
 */

import { prisma } from './prisma';
import { securityConfig } from './security-config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface SessionData {
  id: string;
  userId: string;
  clientId: string;
  role: string;
  permissions: string[];
  ipAddress: string;
  userAgent: string;
  location?: string;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  sessionToken: string;
  refreshToken: string;
}

interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  reason?: string;
  requiresReauth?: boolean;
}

/**
 * Generate secure session tokens
 */
function generateSessionTokens(): { sessionToken: string; refreshToken: string } {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const refreshToken = crypto.randomBytes(32).toString('hex');
  
  return { sessionToken, refreshToken };
}

/**
 * Create a new session
 */
export async function createSession(
  userId: string,
  clientId: string,
  role: string,
  permissions: string[],
  ipAddress: string,
  userAgent: string,
  location?: string
): Promise<SessionData> {
  const { sessionToken, refreshToken } = generateSessionTokens();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + securityConfig.session.absoluteTimeout);
  
  // Check concurrent session limit
  const activeSessions = await prisma.sessions.count({
    where: {
      userId,
      isActive: true,
      expiresAt: { gt: now }
    }
  });
  
  if (activeSessions >= securityConfig.session.maxConcurrentSessions) {
    // Revoke oldest session
    const oldestSession = await prisma.sessions.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastActivity: 'asc' }
    });
    
    if (oldestSession) {
      await prisma.sessions.update({
        where: { id: oldestSession.id },
        data: { isActive: false, revokedAt: now }
      });
    }
  }
  
  // Create new session
  const session = await prisma.sessions.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      clientId,
      sessionToken,
      refreshToken,
      ipAddress,
      userAgent,
      location,
      role,
      permissions: JSON.stringify(permissions),
      createdAt: now,
      lastActivity: now,
      expiresAt,
      isActive: true
    }
  });
  
  return {
    id: session.id,
    userId: session.userId,
    clientId: session.clientId,
    role: session.role,
    permissions: JSON.parse(session.permissions),
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    location: session.location || undefined,
    createdAt: session.createdAt,
    lastActivity: session.lastActivity,
    expiresAt: session.expiresAt,
    isActive: session.isActive,
    sessionToken: session.sessionToken,
    refreshToken: session.refreshToken
  };
}

/**
 * Validate session
 */
export async function validateSession(
  sessionToken: string,
  ipAddress: string,
  userAgent: string
): Promise<SessionValidationResult> {
  try {
    const session = await prisma.sessions.findFirst({
      where: {
        sessionToken,
        isActive: true
      }
    });
    
    if (!session) {
      return { isValid: false, reason: 'Session not found' };
    }
    
    const now = new Date();
    
    // Check if session is expired
    if (session.expiresAt < now) {
      await prisma.sessions.update({
        where: { id: session.id },
        data: { isActive: false, revokedAt: now }
      });
      return { isValid: false, reason: 'Session expired' };
    }
    
    // Check idle timeout
    const idleTime = now.getTime() - session.lastActivity.getTime();
    if (idleTime > securityConfig.session.idleTimeout) {
      await prisma.sessions.update({
        where: { id: session.id },
        data: { isActive: false, revokedAt: now }
      });
      return { isValid: false, reason: 'Session idle timeout' };
    }
    
    // Check IP address binding
    if (securityConfig.session.enableSessionBinding && session.ipAddress !== ipAddress) {
      return { 
        isValid: false, 
        reason: 'IP address mismatch',
        requiresReauth: true
      };
    }
    
    // Check user agent binding
    if (securityConfig.session.enableSessionBinding && session.userAgent !== userAgent) {
      return { 
        isValid: false, 
        reason: 'User agent mismatch',
        requiresReauth: true
      };
    }
    
    // Update last activity
    await prisma.sessions.update({
      where: { id: session.id },
      data: { lastActivity: now }
    });
    
    return {
      isValid: true,
      session: {
        id: session.id,
        userId: session.userId,
        clientId: session.clientId,
        role: session.role,
        permissions: JSON.parse(session.permissions),
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        location: session.location || undefined,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt,
        isActive: session.isActive,
        sessionToken: session.sessionToken,
        refreshToken: session.refreshToken
      }
    };
    
  } catch (error) {
    console.error('❌ Session validation error:', error);
    return { isValid: false, reason: 'Session validation failed' };
  }
}

/**
 * Refresh session
 */
export async function refreshSession(
  refreshToken: string,
  ipAddress: string,
  userAgent: string
): Promise<SessionValidationResult> {
  try {
    const session = await prisma.sessions.findFirst({
      where: {
        refreshToken,
        isActive: true
      }
    });
    
    if (!session) {
      return { isValid: false, reason: 'Refresh token not found' };
    }
    
    const now = new Date();
    
    // Check if session is expired
    if (session.expiresAt < now) {
      await prisma.sessions.update({
        where: { id: session.id },
        data: { isActive: false, revokedAt: now }
      });
      return { isValid: false, reason: 'Session expired' };
    }
    
    // Generate new tokens
    const { sessionToken: newSessionToken, refreshToken: newRefreshToken } = generateSessionTokens();
    const newExpiresAt = new Date(now.getTime() + securityConfig.session.absoluteTimeout);
    
    // Update session
    await prisma.sessions.update({
      where: { id: session.id },
      data: {
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken,
        lastActivity: now,
        expiresAt: newExpiresAt,
        ipAddress,
        userAgent
      }
    });
    
    return {
      isValid: true,
      session: {
        id: session.id,
        userId: session.userId,
        clientId: session.clientId,
        role: session.role,
        permissions: JSON.parse(session.permissions),
        ipAddress,
        userAgent,
        location: session.location || undefined,
        createdAt: session.createdAt,
        lastActivity: now,
        expiresAt: newExpiresAt,
        isActive: session.isActive,
        sessionToken: newSessionToken,
        refreshToken: newRefreshToken
      }
    };
    
  } catch (error) {
    console.error('❌ Session refresh error:', error);
    return { isValid: false, reason: 'Session refresh failed' };
  }
}

/**
 * Revoke session
 */
export async function revokeSession(sessionToken: string): Promise<boolean> {
  try {
    await prisma.sessions.updateMany({
      where: { sessionToken },
      data: { 
        isActive: false, 
        revokedAt: new Date() 
      }
    });
    return true;
  } catch (error) {
    console.error('❌ Session revocation error:', error);
    return false;
  }
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  try {
    await prisma.sessions.updateMany({
      where: { userId },
      data: { 
        isActive: false, 
        revokedAt: new Date() 
      }
    });
    return true;
  } catch (error) {
    console.error('❌ User session revocation error:', error);
    return false;
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.sessions.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { 
            lastActivity: { 
              lt: new Date(Date.now() - securityConfig.session.idleTimeout) 
            } 
          }
        ],
        isActive: true
      },
      data: { 
        isActive: false, 
        revokedAt: new Date() 
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('❌ Session cleanup error:', error);
    return 0;
  }
}

/**
 * Get active sessions for a user
 */
export async function getUserActiveSessions(userId: string): Promise<SessionData[]> {
  try {
    const sessions = await prisma.sessions.findMany({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActivity: 'desc' }
    });
    
    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      clientId: session.clientId,
      role: session.role,
      permissions: JSON.parse(session.permissions),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      location: session.location || undefined,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      sessionToken: session.sessionToken,
      refreshToken: session.refreshToken
    }));
  } catch (error) {
    console.error('❌ Get user sessions error:', error);
    return [];
  }
}

/**
 * Check if session requires re-authentication for sensitive operations
 */
export async function requiresReauthForSensitive(
  sessionToken: string,
  operation: string
): Promise<boolean> {
  if (!securityConfig.session.requireReauthForSensitive) {
    return false;
  }
  
  const sensitiveOperations = [
    'change-password',
    'update-profile',
    'delete-account',
    'admin-operations',
    'financial-operations'
  ];
  
  if (!sensitiveOperations.includes(operation)) {
    return false;
  }
  
  try {
    const session = await prisma.sessions.findFirst({
      where: { sessionToken, isActive: true }
    });
    
    if (!session) {
      return true;
    }
    
    // Check if session was created recently (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return session.createdAt < fiveMinutesAgo;
    
  } catch (error) {
    console.error('❌ Reauth check error:', error);
    return true;
  }
}