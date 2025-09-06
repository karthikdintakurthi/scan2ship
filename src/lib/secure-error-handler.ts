/**
 * Secure Error Handler
 * Prevents information disclosure in error messages
 */

import { logSecurity, LogCategory } from './logger';

export enum ErrorContext {
  PRODUCTION = 'PRODUCTION',
  DEVELOPMENT = 'DEVELOPMENT',
  TESTING = 'TESTING'
}

interface SecureError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
}

/**
 * Create secure error response
 */
export function createSecureError(
  error: Error | any,
  context: ErrorContext = ErrorContext.PRODUCTION,
  requestId?: string
): SecureError {
  const isDevelopment = context === ErrorContext.DEVELOPMENT;
  const timestamp = new Date().toISOString();

  // Log the full error for internal tracking
  logSecurity('Error occurred', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    requestId,
    context
  }, LogCategory.SYSTEM);

  // Determine error type and create appropriate response
  if (error instanceof ValidationError) {
    return {
      message: isDevelopment ? error.message : 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      timestamp,
      requestId,
      ...(isDevelopment && { details: error.details })
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      message: 'Authentication failed',
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      timestamp,
      requestId
    };
  }

  if (error instanceof AuthorizationError) {
    return {
      message: 'Access denied',
      code: 'AUTHORIZATION_ERROR',
      statusCode: 403,
      timestamp,
      requestId
    };
  }

  if (error instanceof RateLimitError) {
    return {
      message: 'Too many requests',
      code: 'RATE_LIMIT_ERROR',
      statusCode: 429,
      timestamp,
      requestId,
      ...(isDevelopment && { details: { retryAfter: error.retryAfter } })
    };
  }

  if (error instanceof DatabaseError) {
    return {
      message: isDevelopment ? error.message : 'Database operation failed',
      code: 'DATABASE_ERROR',
      statusCode: 500,
      timestamp,
      requestId,
      ...(isDevelopment && { details: { operation: error.operation } })
    };
  }

  if (error instanceof ExternalAPIError) {
    return {
      message: 'External service unavailable',
      code: 'EXTERNAL_API_ERROR',
      statusCode: 502,
      timestamp,
      requestId,
      ...(isDevelopment && { details: { service: error.service } })
    };
  }

  if (error instanceof SecurityError) {
    return {
      message: 'Security violation detected',
      code: 'SECURITY_ERROR',
      statusCode: 403,
      timestamp,
      requestId
    };
  }

  // Generic error
  return {
    message: isDevelopment ? 
      (error instanceof Error ? error.message : String(error)) : 
      'An internal error occurred',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    timestamp,
    requestId
  };
}

/**
 * Sanitize error message for client
 */
export function sanitizeErrorMessage(
  message: string,
  context: ErrorContext = ErrorContext.PRODUCTION
): string {
  if (context === ErrorContext.DEVELOPMENT) {
    return message;
  }

  // Remove sensitive information patterns
  let sanitized = message;

  // Remove file paths
  sanitized = sanitized.replace(/\/[^\s]*\/[^\s]*/g, '[PATH]');

  // Remove IP addresses
  sanitized = sanitized.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]');

  // Remove email addresses
  sanitized = sanitized.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');

  // Remove tokens and keys
  sanitized = sanitized.replace(/\b[A-Za-z0-9]{20,}\b/g, '[TOKEN]');

  // Remove database connection strings
  sanitized = sanitized.replace(/postgresql:\/\/[^\s]*/gi, '[DB_CONNECTION]');
  sanitized = sanitized.replace(/mysql:\/\/[^\s]*/gi, '[DB_CONNECTION]');

  // Remove stack traces
  sanitized = sanitized.replace(/at\s+.*\n/g, '');
  sanitized = sanitized.replace(/Error:\s+.*\n/g, '');

  // Remove sensitive keywords
  const sensitiveKeywords = [
    'password', 'secret', 'key', 'token', 'credential',
    'database', 'connection', 'config', 'environment'
  ];

  for (const keyword of sensitiveKeywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '[REDACTED]');
  }

  return sanitized.trim() || 'An error occurred';
}

/**
 * Custom error classes
 */
export class ValidationError extends Error {
  public details?: Record<string, any>;
  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class RateLimitError extends Error {
  public retryAfter?: number;
  constructor(message: string = 'Rate limit exceeded', retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends Error {
  public operation?: string;
  constructor(message: string, operation?: string) {
    super(message);
    this.name = 'DatabaseError';
    this.operation = operation;
  }
}

export class ExternalAPIError extends Error {
  public service?: string;
  constructor(message: string, service?: string) {
    super(message);
    this.name = 'ExternalAPIError';
    this.service = service;
  }
}

export class SecurityError extends Error {
  constructor(message: string = 'Security violation detected') {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Wrap function with secure error handling
 */
export function withSecureErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  context: ErrorContext = ErrorContext.PRODUCTION,
  requestId?: string
) {
  return async (...args: T): Promise<R | SecureError> => {
    try {
      return await fn(...args);
    } catch (error) {
      return createSecureError(error, context, requestId);
    }
  };
}

/**
 * Create error response for Next.js API routes
 */
export function createErrorResponse(
  error: Error | any,
  context: ErrorContext = ErrorContext.PRODUCTION,
  requestId?: string
) {
  const secureError = createSecureError(error, context, requestId);
  
  return {
    error: secureError.message,
    code: secureError.code,
    timestamp: secureError.timestamp,
    ...(secureError.requestId && { requestId: secureError.requestId }),
    ...(secureError.details && { details: secureError.details })
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
 * Get error context from environment
 */
export function getErrorContext(): ErrorContext {
  const env = process.env.NODE_ENV;
  
  switch (env) {
    case 'development':
      return ErrorContext.DEVELOPMENT;
    case 'test':
      return ErrorContext.TESTING;
    case 'production':
    default:
      return ErrorContext.PRODUCTION;
  }
}
