/**
 * Comprehensive Audit Logging System
 * Provides detailed security and operational logging
 */

import { prisma } from './prisma';
import crypto from 'crypto';

export enum AuditEventType {
  // Authentication Events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  
  // Authorization Events
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  
  // Data Events
  DATA_CREATED = 'DATA_CREATED',
  DATA_UPDATED = 'DATA_UPDATED',
  DATA_DELETED = 'DATA_DELETED',
  DATA_ACCESSED = 'DATA_ACCESSED',
  DATA_EXPORTED = 'DATA_EXPORTED',
  
  // Security Events
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_REVOKED = 'SESSION_REVOKED',
  CSRF_ATTEMPT = 'CSRF_ATTEMPT',
  SQL_INJECTION_ATTEMPT = 'SQL_INJECTION_ATTEMPT',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
  
  // System Events
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  BACKUP_CREATED = 'BACKUP_CREATED',
  BACKUP_RESTORED = 'BACKUP_RESTORED',
  
  // API Events
  API_CALL = 'API_CALL',
  API_ERROR = 'API_ERROR',
  WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED',
  WEBHOOK_FAILED = 'WEBHOOK_FAILED',
  
  // File Events
  FILE_UPLOADED = 'FILE_UPLOADED',
  FILE_DOWNLOADED = 'FILE_DOWNLOADED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_SCAN_FAILED = 'FILE_SCAN_FAILED',
  
  // Order Events
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_DELETED = 'ORDER_DELETED',
  ORDER_FULFILLED = 'ORDER_FULFILLED',
  
  // Credit Events
  CREDIT_ADDED = 'CREDIT_ADDED',
  CREDIT_DEDUCTED = 'CREDIT_DEDUCTED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED'
}

export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface AuditLogEntry {
  id: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  userId?: string;
  clientId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  resource?: string;
  action?: string;
  details: Record<string, any>;
  metadata: {
    timestamp: Date;
    requestId?: string;
    correlationId?: string;
    source: string;
    version: string;
  };
  riskScore: number;
  tags: string[];
}

interface AuditLogFilter {
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  userId?: string;
  clientId?: string;
  startDate?: Date;
  endDate?: Date;
  ipAddress?: string;
  resource?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

/**
 * Calculate risk score based on event type and context
 */
function calculateRiskScore(eventType: AuditEventType, details: Record<string, any>): number {
  let baseScore = 0;
  
  // Base scores by event type
  const eventScores: Record<AuditEventType, number> = {
    [AuditEventType.LOGIN_SUCCESS]: 1,
    [AuditEventType.LOGIN_FAILED]: 3,
    [AuditEventType.LOGOUT]: 1,
    [AuditEventType.PASSWORD_CHANGE]: 2,
    [AuditEventType.PASSWORD_RESET]: 4,
    [AuditEventType.MFA_ENABLED]: 1,
    [AuditEventType.MFA_DISABLED]: 3,
    [AuditEventType.PERMISSION_GRANTED]: 2,
    [AuditEventType.PERMISSION_DENIED]: 4,
    [AuditEventType.ROLE_CHANGED]: 5,
    [AuditEventType.ACCESS_GRANTED]: 1,
    [AuditEventType.ACCESS_DENIED]: 3,
    [AuditEventType.DATA_CREATED]: 1,
    [AuditEventType.DATA_UPDATED]: 2,
    [AuditEventType.DATA_DELETED]: 4,
    [AuditEventType.DATA_ACCESSED]: 1,
    [AuditEventType.DATA_EXPORTED]: 3,
    [AuditEventType.SUSPICIOUS_ACTIVITY]: 8,
    [AuditEventType.RATE_LIMIT_EXCEEDED]: 6,
    [AuditEventType.INVALID_TOKEN]: 5,
    [AuditEventType.SESSION_EXPIRED]: 2,
    [AuditEventType.SESSION_REVOKED]: 3,
    [AuditEventType.CSRF_ATTEMPT]: 7,
    [AuditEventType.SQL_INJECTION_ATTEMPT]: 9,
    [AuditEventType.XSS_ATTEMPT]: 8,
    [AuditEventType.SYSTEM_STARTUP]: 1,
    [AuditEventType.SYSTEM_SHUTDOWN]: 2,
    [AuditEventType.CONFIGURATION_CHANGED]: 4,
    [AuditEventType.BACKUP_CREATED]: 2,
    [AuditEventType.BACKUP_RESTORED]: 5,
    [AuditEventType.API_CALL]: 1,
    [AuditEventType.API_ERROR]: 3,
    [AuditEventType.WEBHOOK_RECEIVED]: 2,
    [AuditEventType.WEBHOOK_FAILED]: 4,
    [AuditEventType.FILE_UPLOADED]: 2,
    [AuditEventType.FILE_DOWNLOADED]: 1,
    [AuditEventType.FILE_DELETED]: 3,
    [AuditEventType.FILE_SCAN_FAILED]: 5,
    [AuditEventType.ORDER_CREATED]: 1,
    [AuditEventType.ORDER_UPDATED]: 2,
    [AuditEventType.ORDER_DELETED]: 4,
    [AuditEventType.ORDER_FULFILLED]: 1,
    [AuditEventType.CREDIT_ADDED]: 2,
    [AuditEventType.CREDIT_DEDUCTED]: 2,
    [AuditEventType.PAYMENT_PROCESSED]: 3,
    [AuditEventType.PAYMENT_FAILED]: 4
  };
  
  baseScore = eventScores[eventType] || 1;
  
  // Adjust based on context
  if (details.failedAttempts && details.failedAttempts > 3) {
    baseScore += 2;
  }
  
  if (details.isAdminAction) {
    baseScore += 2;
  }
  
  if (details.sensitiveData) {
    baseScore += 3;
  }
  
  if (details.externalAccess) {
    baseScore += 1;
  }
  
  return Math.min(baseScore, 10); // Cap at 10
}

/**
 * Determine severity based on risk score
 */
function determineSeverity(riskScore: number): AuditSeverity {
  if (riskScore >= 8) return AuditSeverity.CRITICAL;
  if (riskScore >= 6) return AuditSeverity.HIGH;
  if (riskScore >= 4) return AuditSeverity.MEDIUM;
  return AuditSeverity.LOW;
}

/**
 * Generate tags based on event type and context
 */
function generateTags(eventType: AuditEventType, details: Record<string, any>): string[] {
  const tags: string[] = [];
  
  // Event type tags
  if (eventType.includes('LOGIN')) tags.push('authentication');
  if (eventType.includes('PASSWORD')) tags.push('password', 'authentication');
  if (eventType.includes('PERMISSION') || eventType.includes('ROLE')) tags.push('authorization');
  if (eventType.includes('DATA')) tags.push('data-access');
  if (eventType.includes('SECURITY') || eventType.includes('SUSPICIOUS')) tags.push('security');
  if (eventType.includes('API')) tags.push('api');
  if (eventType.includes('FILE')) tags.push('file-operations');
  if (eventType.includes('ORDER')) tags.push('order-management');
  if (eventType.includes('CREDIT') || eventType.includes('PAYMENT')) tags.push('financial');
  
  // Context tags
  if (details.isAdminAction) tags.push('admin-action');
  if (details.sensitiveData) tags.push('sensitive-data');
  if (details.externalAccess) tags.push('external-access');
  if (details.failedAttempts > 0) tags.push('failed-attempt');
  
  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Log an audit event
 */
export async function logAuditEvent(
  eventType: AuditEventType,
  details: Record<string, any>,
  context: {
    userId?: string;
    clientId?: string;
    sessionId?: string;
    ipAddress: string;
    userAgent: string;
    resource?: string;
    action?: string;
    requestId?: string;
    correlationId?: string;
  }
): Promise<void> {
  try {
    const riskScore = calculateRiskScore(eventType, details);
    const severity = determineSeverity(riskScore);
    const tags = generateTags(eventType, details);
    
    const auditEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      eventType,
      severity,
      userId: context.userId,
      clientId: context.clientId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      resource: context.resource,
      action: context.action,
      details,
      metadata: {
        timestamp: new Date(),
        requestId: context.requestId,
        correlationId: context.correlationId,
        source: 'scan2ship-api',
        version: '1.0.0'
      },
      riskScore,
      tags
    };
    
    // Store in database
    await prisma.audit_logs.create({
      data: {
        id: auditEntry.id,
        eventType: auditEntry.eventType,
        severity: auditEntry.severity,
        userId: auditEntry.userId,
        clientId: auditEntry.clientId,
        sessionId: auditEntry.sessionId,
        ipAddress: auditEntry.ipAddress,
        userAgent: auditEntry.userAgent,
        resource: auditEntry.resource,
        action: auditEntry.action,
        details: JSON.stringify(auditEntry.details),
        metadata: JSON.stringify(auditEntry.metadata),
        riskScore: auditEntry.riskScore,
        tags: auditEntry.tags,
        createdAt: auditEntry.metadata.timestamp
      }
    });
    
    // Log to console for high-severity events
    if (severity === AuditSeverity.HIGH || severity === AuditSeverity.CRITICAL) {
      console.warn(`🚨 [AUDIT] ${severity} - ${eventType}:`, {
        userId: context.userId,
        ipAddress: context.ipAddress,
        riskScore,
        details
      });
    }
    
  } catch (error) {
    console.error('❌ [AUDIT] Failed to log audit event:', error);
  }
}

/**
 * Query audit logs
 */
export async function queryAuditLogs(filter: AuditLogFilter): Promise<{
  logs: AuditLogEntry[];
  total: number;
  hasMore: boolean;
}> {
  try {
    const whereClause: any = {};
    
    if (filter.eventType) whereClause.eventType = filter.eventType;
    if (filter.severity) whereClause.severity = filter.severity;
    if (filter.userId) whereClause.userId = filter.userId;
    if (filter.clientId) whereClause.clientId = filter.clientId;
    if (filter.ipAddress) whereClause.ipAddress = filter.ipAddress;
    if (filter.resource) whereClause.resource = filter.resource;
    
    if (filter.startDate || filter.endDate) {
      whereClause.createdAt = {};
      if (filter.startDate) whereClause.createdAt.gte = filter.startDate;
      if (filter.endDate) whereClause.createdAt.lte = filter.endDate;
    }
    
    if (filter.tags && filter.tags.length > 0) {
      whereClause.tags = {
        hasSome: filter.tags
      };
    }
    
    const limit = filter.limit || 100;
    const offset = filter.offset || 0;
    
    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.audit_logs.count({ where: whereClause })
    ]);
    
    const auditLogs: AuditLogEntry[] = logs.map(log => ({
      id: log.id,
      eventType: log.eventType as AuditEventType,
      severity: log.severity as AuditSeverity,
      userId: log.userId || undefined,
      clientId: log.clientId || undefined,
      sessionId: log.sessionId || undefined,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      resource: log.resource || undefined,
      action: log.action || undefined,
      details: JSON.parse(log.details),
      metadata: JSON.parse(log.metadata),
      riskScore: log.riskScore,
      tags: log.tags
    }));
    
    return {
      logs: auditLogs,
      total,
      hasMore: offset + limit < total
    };
    
  } catch (error) {
    console.error('❌ [AUDIT] Failed to query audit logs:', error);
    return { logs: [], total: 0, hasMore: false };
  }
}

/**
 * Get security metrics
 */
export async function getSecurityMetrics(timeframe: '1h' | '24h' | '7d' | '30d'): Promise<{
  totalEvents: number;
  criticalEvents: number;
  highEvents: number;
  failedLogins: number;
  suspiciousActivity: number;
  topEventTypes: Array<{ eventType: string; count: number }>;
  topIPs: Array<{ ipAddress: string; count: number }>;
  riskTrend: Array<{ date: string; riskScore: number }>;
}> {
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
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
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
      totalEvents,
      criticalEvents,
      highEvents,
      failedLogins,
      suspiciousActivity,
      topEventTypes,
      topIPs
    ] = await Promise.all([
      prisma.audit_logs.count({ where: whereClause }),
      prisma.audit_logs.count({ where: { ...whereClause, severity: 'CRITICAL' } }),
      prisma.audit_logs.count({ where: { ...whereClause, severity: 'HIGH' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'LOGIN_FAILED' } }),
      prisma.audit_logs.count({ where: { ...whereClause, eventType: 'SUSPICIOUS_ACTIVITY' } }),
      prisma.audit_logs.groupBy({
        by: ['eventType'],
        where: whereClause,
        _count: { eventType: true },
        orderBy: { _count: { eventType: 'desc' } },
        take: 10
      }),
      prisma.audit_logs.groupBy({
        by: ['ipAddress'],
        where: whereClause,
        _count: { ipAddress: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10
      })
    ]);
    
    return {
      totalEvents,
      criticalEvents,
      highEvents,
      failedLogins,
      suspiciousActivity,
      topEventTypes: topEventTypes.map(item => ({
        eventType: item.eventType,
        count: item._count.eventType
      })),
      topIPs: topIPs.map(item => ({
        ipAddress: item.ipAddress,
        count: item._count.ipAddress
      })),
      riskTrend: [] // TODO: Implement risk trend calculation
    };
    
  } catch (error) {
    console.error('❌ [AUDIT] Failed to get security metrics:', error);
    return {
      totalEvents: 0,
      criticalEvents: 0,
      highEvents: 0,
      failedLogins: 0,
      suspiciousActivity: 0,
      topEventTypes: [],
      topIPs: [],
      riskTrend: []
    };
  }
}

/**
 * Clean up old audit logs
 */
export async function cleanupAuditLogs(retentionDays: number = 90): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    const result = await prisma.audit_logs.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });
    
    console.log(`🧹 [AUDIT] Cleaned up ${result.count} old audit logs`);
    return result.count;
    
  } catch (error) {
    console.error('❌ [AUDIT] Failed to cleanup audit logs:', error);
    return 0;
  }
}
