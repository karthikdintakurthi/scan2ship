/**
 * Security Monitoring System
 * Provides real-time security monitoring and alerting
 */

import { prisma } from './prisma';
import { logAuditEvent, AuditEventType, AuditSeverity } from './audit-logger';

interface SecurityAlert {
  id: string;
  type: 'BRUTE_FORCE' | 'RATE_LIMIT' | 'SUSPICIOUS_ACTIVITY' | 'MALWARE_DETECTED' | 'UNAUTHORIZED_ACCESS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
}

interface SecurityMetrics {
  totalRequests: number;
  failedLogins: number;
  blockedRequests: number;
  suspiciousActivities: number;
  malwareDetections: number;
  averageResponseTime: number;
  errorRate: number;
  topThreats: Array<{ type: string; count: number }>;
  topIPs: Array<{ ip: string; requests: number; threats: number }>;
}

/**
 * Monitor login attempts for brute force attacks
 */
export async function monitorLoginAttempts(
  email: string,
  ipAddress: string,
  success: boolean
): Promise<void> {
  const timeWindow = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 5;
  
  try {
    // Count failed attempts in the last 15 minutes
    const failedAttempts = await prisma.audit_logs.count({
      where: {
        eventType: 'LOGIN_FAILED',
        ipAddress,
        createdAt: {
          gte: new Date(Date.now() - timeWindow)
        }
      }
    });
    
    if (failedAttempts >= maxAttempts) {
      await logAuditEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        {
          type: 'BRUTE_FORCE_ATTEMPT',
          email,
          ipAddress,
          failedAttempts,
          timeWindow: '15 minutes'
        },
        {
          ipAddress,
          userAgent: 'Security Monitor',
          resource: 'authentication',
          action: 'brute_force_detected'
        }
      );
      
      // Block IP for 1 hour
      await blockIP(ipAddress, 'Brute force attack detected', 60);
    }
  } catch (error) {
    console.error('❌ Failed to monitor login attempts:', error);
  }
}

/**
 * Monitor rate limiting violations
 */
export async function monitorRateLimitViolations(
  ipAddress: string,
  endpoint: string,
  limit: number,
  actual: number
): Promise<void> {
  try {
    await logAuditEvent(
      AuditEventType.RATE_LIMIT_EXCEEDED,
      {
        ipAddress,
        endpoint,
        limit,
        actual,
        violationType: 'RATE_LIMIT_EXCEEDED'
      },
      {
        ipAddress,
        userAgent: 'Security Monitor',
        resource: endpoint,
        action: 'rate_limit_violation'
      }
    );
    
    // If significantly over limit, block IP temporarily
    if (actual > limit * 2) {
      await blockIP(ipAddress, 'Excessive rate limit violations', 30);
    }
  } catch (error) {
    console.error('❌ Failed to monitor rate limit violations:', error);
  }
}

/**
 * Monitor suspicious file uploads
 */
export async function monitorFileUploads(
  fileName: string,
  fileSize: number,
  mimeType: string,
  securityScore: number,
  userId?: string,
  ipAddress?: string
): Promise<void> {
  try {
    if (securityScore < 50) {
      await logAuditEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        {
          type: 'SUSPICIOUS_FILE_UPLOAD',
          fileName,
          fileSize,
          mimeType,
          securityScore,
          threats: ['Low security score']
        },
        {
          userId,
          ipAddress: ipAddress || 'unknown',
          userAgent: 'Security Monitor',
          resource: 'file-upload',
          action: 'suspicious_upload'
        }
      );
    }
  } catch (error) {
    console.error('❌ Failed to monitor file uploads:', error);
  }
}

/**
 * Block IP address
 */
async function blockIP(
  ipAddress: string,
  reason: string,
  durationMinutes: number
): Promise<void> {
  try {
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
    
    await prisma.blocked_ips.create({
      data: {
        id: crypto.randomUUID(),
        ipAddress,
        reason,
        expiresAt,
        createdAt: new Date()
      }
    });
    
    console.log(`🚫 Blocked IP ${ipAddress} for ${durationMinutes} minutes: ${reason}`);
  } catch (error) {
    console.error('❌ Failed to block IP:', error);
  }
}

/**
 * Check if IP is blocked
 */
export async function isIPBlocked(ipAddress: string): Promise<boolean> {
  try {
    const blocked = await prisma.blocked_ips.findFirst({
      where: {
        ipAddress,
        expiresAt: { gt: new Date() }
      }
    });
    
    return !!blocked;
  } catch (error) {
    console.error('❌ Failed to check IP block status:', error);
    return false;
  }
}

/**
 * Get security metrics
 */
export async function getSecurityMetrics(timeframe: '1h' | '24h' | '7d'): Promise<SecurityMetrics> {
  try {
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    const whereClause = {
      createdAt: {
        gte: startDate,
        lte: now
      }
    };
    
    const [
      totalRequests,
      failedLogins,
      blockedRequests,
      suspiciousActivities,
      malwareDetections
    ] = await Promise.all([
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'API_CALL' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'LOGIN_FAILED' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'ACCESS_DENIED' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'SUSPICIOUS_ACTIVITY' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'FILE_SCAN_FAILED' } })
    ]);
    
    return {
      totalRequests,
      failedLogins,
      blockedRequests,
      suspiciousActivities,
      malwareDetections,
      averageResponseTime: 0, // TODO: Implement response time tracking
      errorRate: totalRequests > 0 ? (failedLogins + blockedRequests) / totalRequests : 0,
      topThreats: [], // TODO: Implement threat analysis
      topIPs: [] // TODO: Implement IP analysis
    };
    
  } catch (error) {
    console.error('❌ Failed to get security metrics:', error);
    return {
      totalRequests: 0,
      failedLogins: 0,
      blockedRequests: 0,
      suspiciousActivities: 0,
      malwareDetections: 0,
      averageResponseTime: 0,
      errorRate: 0,
      topThreats: [],
      topIPs: []
    };
  }
}

/**
 * Clean up expired blocked IPs
 */
export async function cleanupExpiredBlocks(): Promise<number> {
  try {
    const result = await prisma.blocked_ips.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });
    
    return result.count;
  } catch (error) {
    console.error('❌ Failed to cleanup expired blocks:', error);
    return 0;
  }
}
