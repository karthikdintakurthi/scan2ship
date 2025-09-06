/**
 * Comprehensive Error Handling System
 * Provides secure error handling and logging
 */

import { logAuditEvent, AuditEventType } from './audit-logger';

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SECURITY_ERROR = 'SECURITY_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

interface SecurityError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  code: string;
  details?: Record<string, any>;
  stack?: string;
  timestamp: Date;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

/**
 * Create a security error
 */
export function createSecurityError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: Record<string, any>
): SecurityError {
  return {
    type,
    severity,
    message,
    code: `${type}_${Date.now()}`,
    details,
    timestamp: new Date()
  };
}

/**
 * Handle and log security errors
 */
export async function handleSecurityError(
  error: SecurityError,
  context?: {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  }
): Promise<void> {
  try {
    // Log to console based on severity
    const logLevel = getLogLevel(error.severity);
    const logMessage = `🚨 [${error.severity}] ${error.type}: ${error.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage, error.details);
        break;
      case 'warn':
        console.warn(logMessage, error.details);
        break;
      case 'info':
        console.info(logMessage, error.details);
        break;
      default:
        console.log(logMessage, error.details);
    }
    
    // Log to audit system for high severity errors
    if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
      await logAuditEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        {
          errorType: error.type,
          errorMessage: error.message,
          errorCode: error.code,
          severity: error.severity,
          details: error.details,
          stack: error.stack
        },
        {
          userId: context?.userId,
          ipAddress: context?.ipAddress || 'unknown',
          userAgent: context?.userAgent || 'unknown',
          resource: 'error-handler',
          action: 'security_error',
          requestId: context?.requestId
        }
      );
    }
    
  } catch (logError) {
    console.error('❌ Failed to handle security error:', logError);
  }
}

/**
 * Get log level based on error severity
 */
function getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' | 'log' {
  switch (severity) {
    case ErrorSeverity.CRITICAL:
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.MEDIUM:
      return 'warn';
    case ErrorSeverity.LOW:
      return 'info';
    default:
      return 'log';
  }
}

/**
 * Sanitize error message for client response
 */
export function sanitizeErrorMessage(error: SecurityError, isDevelopment: boolean = false): string {
  // In development, show more details
  if (isDevelopment) {
    return error.message;
  }
  
  // In production, return generic messages based on error type
  switch (error.type) {
    case ErrorType.VALIDATION_ERROR:
      return 'Invalid input provided';
    case ErrorType.AUTHENTICATION_ERROR:
      return 'Authentication failed';
    case ErrorType.AUTHORIZATION_ERROR:
      return 'Access denied';
    case ErrorType.RATE_LIMIT_ERROR:
      return 'Too many requests';
    case ErrorType.SECURITY_ERROR:
      return 'Security violation detected';
    case ErrorType.DATABASE_ERROR:
      return 'Database operation failed';
    case ErrorType.EXTERNAL_API_ERROR:
      return 'External service unavailable';
    case ErrorType.FILE_UPLOAD_ERROR:
      return 'File upload failed';
    case ErrorType.INTERNAL_ERROR:
      return 'Internal server error';
    case ErrorType.NETWORK_ERROR:
      return 'Network error occurred';
    default:
      return 'An error occurred';
  }
}

/**
 * Create error response
 */
export function createErrorResponse(
  error: SecurityError,
  statusCode: number = 500,
  isDevelopment: boolean = false
) {
  const sanitizedMessage = sanitizeErrorMessage(error, isDevelopment);
  
  return {
    error: sanitizedMessage,
    code: error.code,
    timestamp: error.timestamp.toISOString(),
    ...(isDevelopment && { details: error.details })
  };
}

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  errorType: ErrorType = ErrorType.INTERNAL_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) {
  return async (...args: T): Promise<R | null> => {
    try {
      return await fn(...args);
    } catch (error) {
      const securityError = createSecurityError(
        errorType,
        error instanceof Error ? error.message : 'Unknown error occurred',
        severity,
        {
          originalError: error instanceof Error ? error.stack : String(error),
          functionName: fn.name
        }
      );
      
      await handleSecurityError(securityError);
      return null;
    }
  };
}

/**
 * Wrap sync function with error handling
 */
export function withSyncErrorHandling<T extends any[], R>(
  fn: (...args: T) => R,
  errorType: ErrorType = ErrorType.INTERNAL_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) {
  return (...args: T): R | null => {
    try {
      return fn(...args);
    } catch (error) {
      const securityError = createSecurityError(
        errorType,
        error instanceof Error ? error.message : 'Unknown error occurred',
        severity,
        {
          originalError: error instanceof Error ? error.stack : String(error),
          functionName: fn.name
        }
      );
      
      handleSecurityError(securityError);
      return null;
    }
  };
}

/**
 * Validate error context
 */
export function validateErrorContext(context: any): boolean {
  if (!context || typeof context !== 'object') {
    return false;
  }
  
  // Check for required fields
  const requiredFields = ['ipAddress', 'userAgent'];
  for (const field of requiredFields) {
    if (!context[field] || typeof context[field] !== 'string') {
      return false;
    }
  }
  
  return true;
}

/**
 * Create error metrics
 */
export function createErrorMetrics(errors: SecurityError[]): {
  totalErrors: number;
  errorsByType: Record<ErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  criticalErrors: number;
  recentErrors: number;
} {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const errorsByType = {} as Record<ErrorType, number>;
  const errorsBySeverity = {} as Record<ErrorSeverity, number>;
  
  let criticalErrors = 0;
  let recentErrors = 0;
  
  for (const error of errors) {
    // Count by type
    errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    
    // Count by severity
    errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    
    // Count critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      criticalErrors++;
    }
    
    // Count recent errors
    if (error.timestamp > oneHourAgo) {
      recentErrors++;
    }
  }
  
  return {
    totalErrors: errors.length,
    errorsByType,
    errorsBySeverity,
    criticalErrors,
    recentErrors
  };
}
