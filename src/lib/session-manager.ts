/**
 * Enhanced Session Management System
 * Provides secure session handling with proper invalidation and audit logging
 */

import { prisma } from '@/lib/prisma';
import { enhancedJwtConfig } from '@/lib/jwt-config';
import crypto from 'crypto';

// Session status
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
  SUSPICIOUS = 'suspicious'
}

// Session types
export enum SessionType {
  LOGIN = 'login',
  API = 'api',
  REFRESH = 'refresh',
  ADMIN = 'admin'
}

// Session security levels
export enum SecurityLevel {
  LOW = 'low',      // Basic web access
  MEDIUM = 'medium', // API access
  HIGH = 'high',    // Admin access
  CRITICAL = 'critical' // Financial/admin operations
}

// Interface for session data
export interface SessionData {
  id: string;
  userId: string;
  clientId: string;
  token: string;
  refreshToken: string;
  type: SessionType;
  securityLevel: SecurityLevel;
  status: SessionStatus;
  expiresAt: Date;
  lastActivity: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Interface for session creation options
export interface CreateSessionOptions {
  userId: string;
  clientId: string;
  type: SessionType;
  securityLevel: SecurityLevel;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  location?: string;
  customExpiry?: number; // Custom expiry in milliseconds
}

// Interface for session validation result
export interface SessionValidationResult {
  isValid: boolean;
  session?: SessionData;
  error?: string;
  requiresReauth?: boolean;
  securityRisk?: boolean;
}

/**
 * Session Manager Class
 */
export class SessionManager {
  /**
   * Create a new session
   */
  static async createSession(options: CreateSessionOptions): Promise<SessionData> {
    const sessionId = crypto.randomUUID();
    
    // Generate tokens based on session type and security level
    const { token, refreshToken, expiresAt } = await this.generateSessionTokens(
      options.userId,
      options.clientId,
      options.type,
      options.securityLevel,
      options.customExpiry
    );

    // Create session record
    const session = await prisma.sessions.create({
      data: {
        id: sessionId,
        userId: options.userId,
        clientId: options.clientId,
        token,
        refreshToken,
        type: options.type,
        securityLevel: options.securityLevel,
        status: SessionStatus.ACTIVE,
        expiresAt,
        lastActivity: new Date(),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceInfo: options.deviceInfo,
        location: options.location,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Log session creation
    await this.logSessionEvent(sessionId, 'session_created', 'success', {
      userId: options.userId,
      type: options.type,
      securityLevel: options.securityLevel
    });

    return session;
  }

  /**
   * Validate session token
   */
  static async validateSession(token: string, ipAddress?: string): Promise<SessionValidationResult> {
    try {
      // Verify JWT token
      const decoded = enhancedJwtConfig.verifyToken(token);
      
      // Get session from database
      const session = await prisma.sessions.findFirst({
        where: {
          token,
          status: SessionStatus.ACTIVE
        }
      });

      if (!session) {
        return {
          isValid: false,
          error: 'Session not found or inactive'
        };
      }

      // Check if session is expired
      if (new Date() > session.expiresAt) {
        await this.updateSessionStatus(session.id, SessionStatus.EXPIRED);
        return {
          isValid: false,
          error: 'Session expired',
          requiresReauth: true
        };
      }

      // Check for suspicious activity
      const securityRisk = await this.detectSecurityRisk(session, ipAddress);
      if (securityRisk) {
        await this.updateSessionStatus(session.id, SessionStatus.SUSPICIOUS);
        return {
          isValid: false,
          error: 'Suspicious activity detected',
          requiresReauth: true,
          securityRisk: true
        };
      }

      // Update last activity
      await this.updateLastActivity(session.id);

      return {
        isValid: true,
        session
      };

    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid session token'
      };
    }
  }

  /**
   * Refresh session
   */
  static async refreshSession(refreshToken: string): Promise<SessionData | null> {
    try {
      // Verify refresh token
      const decoded = enhancedJwtConfig.verifyToken(refreshToken);
      
      // Get session by refresh token
      const session = await prisma.sessions.findFirst({
        where: {
          refreshToken,
          status: SessionStatus.ACTIVE
        }
      });

      if (!session) {
        return null;
      }

      // Generate new tokens
      const { token: newToken, refreshToken: newRefreshToken, expiresAt } = await this.generateSessionTokens(
        session.userId,
        session.clientId,
        session.type,
        session.securityLevel
      );

      // Update session with new tokens
      const updatedSession = await prisma.sessions.update({
        where: { id: session.id },
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          expiresAt,
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });

      // Log session refresh
      await this.logSessionEvent(session.id, 'session_refreshed', 'success');

      return updatedSession;

    } catch (error) {
      console.error('Session refresh failed:', error);
      return null;
    }
  }

  /**
   * Revoke session
   */
  static async revokeSession(sessionId: string, reason: string = 'manual_revocation'): Promise<boolean> {
    try {
      await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status: SessionStatus.REVOKED,
          updatedAt: new Date()
        }
      });

      // Log session revocation
      await this.logSessionEvent(sessionId, 'session_revoked', 'success', { reason });

      return true;
    } catch (error) {
      console.error('Session revocation failed:', error);
      return false;
    }
  }

  /**
   * Revoke all user sessions
   */
  static async revokeAllUserSessions(userId: string, reason: string = 'bulk_revocation'): Promise<number> {
    try {
      const result = await prisma.sessions.updateMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE
        },
        data: {
          status: SessionStatus.REVOKED,
          updatedAt: new Date()
        }
      });

      // Log bulk revocation
      await this.logSessionEvent('bulk', 'bulk_session_revocation', 'success', {
        userId,
        count: result.count,
        reason
      });

      return result.count;
    } catch (error) {
      console.error('Bulk session revocation failed:', error);
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.sessions.updateMany({
        where: {
          status: SessionStatus.ACTIVE,
          expiresAt: {
            lt: new Date()
          }
        },
        data: {
          status: SessionStatus.EXPIRED,
          updatedAt: new Date()
        }
      });

      // Log cleanup
      if (result.count > 0) {
        await this.logSessionEvent('system', 'expired_sessions_cleanup', 'success', {
          count: result.count
        });
      }

      return result.count;
    } catch (error) {
      console.error('Session cleanup failed:', error);
      return 0;
    }
  }

  /**
   * Get active sessions for user
   */
  static async getUserActiveSessions(userId: string): Promise<SessionData[]> {
    try {
      const sessions = await prisma.sessions.findMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE
        },
        orderBy: {
          lastActivity: 'desc'
        }
      });

      return sessions;
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Generate session tokens
   */
  private static async generateSessionTokens(
    userId: string,
    clientId: string,
    type: SessionType,
    securityLevel: SecurityLevel,
    customExpiry?: number
  ): Promise<{ token: string; refreshToken: string; expiresAt: Date }> {
    const payload = {
      userId,
      clientId,
      type,
      securityLevel
    };

    // Determine expiry based on session type and security level
    let expiryMs = this.getSessionExpiry(type, securityLevel);
    if (customExpiry) {
      expiryMs = Math.min(expiryMs, customExpiry);
    }

    const expiresAt = new Date(Date.now() + expiryMs);

    // Generate tokens
    const token = enhancedJwtConfig.generateToken(payload, type);
    const refreshToken = enhancedJwtConfig.generateToken(payload, 'refresh');

    return { token, refreshToken, expiresAt };
  }

  /**
   * Get session expiry time based on type and security level
   */
  private static getSessionExpiry(type: SessionType, securityLevel: SecurityLevel): number {
    const baseExpiry = {
      [SessionType.LOGIN]: 8 * 60 * 60 * 1000,      // 8 hours
      [SessionType.API]: 1 * 60 * 60 * 1000,        // 1 hour
      [SessionType.REFRESH]: 24 * 60 * 60 * 1000,   // 24 hours
      [SessionType.ADMIN]: 4 * 60 * 60 * 1000       // 4 hours
    };

    const securityMultiplier = {
      [SecurityLevel.LOW]: 1,
      [SecurityLevel.MEDIUM]: 0.75,
      [SecurityLevel.HIGH]: 0.5,
      [SecurityLevel.CRITICAL]: 0.25
    };

    return baseExpiry[type] * securityMultiplier[securityLevel];
  }

  /**
   * Update session status
   */
  private static async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
    try {
      await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          status,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update session status:', error);
    }
  }

  /**
   * Update last activity
   */
  private static async updateLastActivity(sessionId: string): Promise<void> {
    try {
      await prisma.sessions.update({
        where: { id: sessionId },
        data: {
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Detect security risks
   */
  private static async detectSecurityRisk(session: SessionData, currentIp?: string): Promise<boolean> {
    // Check for IP address changes (if IP tracking is enabled)
    if (session.ipAddress && currentIp && session.ipAddress !== currentIp) {
      // Log suspicious IP change
      await this.logSessionEvent(session.id, 'ip_address_change', 'warning', {
        oldIp: session.ipAddress,
        newIp: currentIp
      });
      
      // For high security sessions, consider IP changes as suspicious
      if (session.securityLevel === SecurityLevel.HIGH || session.securityLevel === SecurityLevel.CRITICAL) {
        return true;
      }
    }

    // Check for multiple active sessions from different locations
    const activeSessions = await this.getUserActiveSessions(session.userId);
    const uniqueLocations = new Set(activeSessions.map(s => s.location).filter(Boolean));
    
    if (uniqueLocations.size > 3) {
      await this.logSessionEvent(session.id, 'multiple_locations', 'warning', {
        locationCount: uniqueLocations.size
      });
      return true;
    }

    return false;
  }

  /**
   * Log session events
   */
  private static async logSessionEvent(
    sessionId: string,
    event: string,
    level: 'info' | 'warning' | 'error' | 'success',
    details?: any
  ): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          id: crypto.randomUUID(),
          sessionId,
          event,
          level,
          details: details ? JSON.stringify(details) : null,
          timestamp: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to log session event:', error);
    }
  }
}
