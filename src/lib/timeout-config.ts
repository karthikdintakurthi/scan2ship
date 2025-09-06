/**
 * Timeout Configuration System
 * Provides comprehensive timeout management for all operations
 */

export interface TimeoutConfig {
  // API timeouts
  api: {
    default: number; // 30 seconds
    auth: number; // 10 seconds
    database: number; // 15 seconds
    external: number; // 60 seconds
    fileUpload: number; // 300 seconds (5 minutes)
    webhook: number; // 30 seconds
  };
  
  // Database timeouts
  database: {
    connection: number; // 10 seconds
    query: number; // 30 seconds
    transaction: number; // 60 seconds
    migration: number; // 300 seconds (5 minutes)
  };
  
  // External service timeouts
  external: {
    shopify: number; // 30 seconds
    payment: number; // 45 seconds
    email: number; // 30 seconds
    sms: number; // 15 seconds
    webhook: number; // 30 seconds
  };
  
  // File operation timeouts
  file: {
    upload: number; // 300 seconds (5 minutes)
    download: number; // 60 seconds
    scan: number; // 120 seconds (2 minutes)
    process: number; // 180 seconds (3 minutes)
  };
  
  // Security timeouts
  security: {
    rateLimit: number; // 15 minutes
    session: number; // 4 hours
    token: number; // 1 hour
    passwordReset: number; // 1 hour
    mfa: number; // 5 minutes
  };
  
  // System timeouts
  system: {
    startup: number; // 60 seconds
    shutdown: number; // 30 seconds
    healthCheck: number; // 5 seconds
    cleanup: number; // 300 seconds (5 minutes)
  };
}

/**
 * Default timeout configuration
 */
export const defaultTimeoutConfig: TimeoutConfig = {
  api: {
    default: 30000, // 30 seconds
    auth: 10000, // 10 seconds
    database: 15000, // 15 seconds
    external: 60000, // 60 seconds
    fileUpload: 300000, // 5 minutes
    webhook: 30000 // 30 seconds
  },
  
  database: {
    connection: 10000, // 10 seconds
    query: 30000, // 30 seconds
    transaction: 60000, // 60 seconds
    migration: 300000 // 5 minutes
  },
  
  external: {
    shopify: 30000, // 30 seconds
    payment: 45000, // 45 seconds
    email: 30000, // 30 seconds
    sms: 15000, // 15 seconds
    webhook: 30000 // 30 seconds
  },
  
  file: {
    upload: 300000, // 5 minutes
    download: 60000, // 60 seconds
    scan: 120000, // 2 minutes
    process: 180000 // 3 minutes
  },
  
  security: {
    rateLimit: 900000, // 15 minutes
    session: 14400000, // 4 hours
    token: 3600000, // 1 hour
    passwordReset: 3600000, // 1 hour
    mfa: 300000 // 5 minutes
  },
  
  system: {
    startup: 60000, // 60 seconds
    shutdown: 30000, // 30 seconds
    healthCheck: 5000, // 5 seconds
    cleanup: 300000 // 5 minutes
  }
};

/**
 * Get timeout configuration from environment or use defaults
 */
export function getTimeoutConfig(): TimeoutConfig {
  const config = { ...defaultTimeoutConfig };
  
  // Override with environment variables if present
  if (process.env.API_TIMEOUT) {
    config.api.default = parseInt(process.env.API_TIMEOUT, 10);
  }
  
  if (process.env.DATABASE_TIMEOUT) {
    config.database.query = parseInt(process.env.DATABASE_TIMEOUT, 10);
  }
  
  if (process.env.EXTERNAL_TIMEOUT) {
    config.external.shopify = parseInt(process.env.EXTERNAL_TIMEOUT, 10);
  }
  
  if (process.env.FILE_UPLOAD_TIMEOUT) {
    config.file.upload = parseInt(process.env.FILE_UPLOAD_TIMEOUT, 10);
  }
  
  return config;
}

/**
 * Create timeout promise
 */
export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${errorMessage} (${timeoutMs}ms)`));
      }, timeoutMs);
    })
  ]);
}

/**
 * Wrap function with timeout
 */
export function withTimeout<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  timeoutMs: number,
  errorMessage?: string
) {
  return async (...args: T): Promise<R> => {
    return createTimeoutPromise(
      fn(...args),
      timeoutMs,
      errorMessage || `Function ${fn.name} timed out`
    );
  };
}

/**
 * Create AbortController with timeout
 */
export function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  
  setTimeout(() => {
    controller.abort();
  }, timeoutMs);
  
  return controller;
}

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = defaultTimeoutConfig.external.shopify
): Promise<Response> {
  const controller = createTimeoutController(timeoutMs);
  
  return fetch(url, {
    ...options,
    signal: controller.signal
  });
}

/**
 * Database query with timeout
 */
export async function queryWithTimeout<T>(
  queryFn: () => Promise<T>,
  timeoutMs: number = defaultTimeoutConfig.database.query
): Promise<T> {
  return createTimeoutPromise(
    queryFn(),
    timeoutMs,
    'Database query timed out'
  );
}

/**
 * File operation with timeout
 */
export async function fileOperationWithTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number = defaultTimeoutConfig.file.upload
): Promise<T> {
  return createTimeoutPromise(
    operation(),
    timeoutMs,
    'File operation timed out'
  );
}

/**
 * Webhook call with timeout
 */
export async function webhookWithTimeout(
  url: string,
  data: any,
  timeoutMs: number = defaultTimeoutConfig.external.webhook
): Promise<Response> {
  return fetchWithTimeout(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data)
  }, timeoutMs);
}

/**
 * Validate timeout configuration
 */
export function validateTimeoutConfig(config: TimeoutConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate API timeouts
  if (config.api.default <= 0) {
    errors.push('API default timeout must be positive');
  }
  
  if (config.api.auth <= 0) {
    errors.push('API auth timeout must be positive');
  }
  
  if (config.api.database <= 0) {
    errors.push('API database timeout must be positive');
  }
  
  // Validate database timeouts
  if (config.database.connection <= 0) {
    errors.push('Database connection timeout must be positive');
  }
  
  if (config.database.query <= 0) {
    errors.push('Database query timeout must be positive');
  }
  
  // Validate external timeouts
  if (config.external.shopify <= 0) {
    errors.push('Shopify timeout must be positive');
  }
  
  // Validate file timeouts
  if (config.file.upload <= 0) {
    errors.push('File upload timeout must be positive');
  }
  
  // Validate security timeouts
  if (config.security.session <= 0) {
    errors.push('Session timeout must be positive');
  }
  
  if (config.security.rateLimit <= 0) {
    errors.push('Rate limit timeout must be positive');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get timeout for specific operation
 */
export function getTimeoutForOperation(
  operation: keyof TimeoutConfig,
  subOperation?: string
): number {
  const config = getTimeoutConfig();
  const operationConfig = config[operation];
  
  if (typeof operationConfig === 'object' && subOperation) {
    return (operationConfig as any)[subOperation] || config.api.default;
  }
  
  if (typeof operationConfig === 'number') {
    return operationConfig;
  }
  
  return config.api.default;
}

/**
 * Create timeout middleware for Express/Next.js
 */
export function createTimeoutMiddleware(timeoutMs: number) {
  return (req: any, res: any, next: any) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: `Request timed out after ${timeoutMs}ms`,
          timestamp: new Date().toISOString()
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    res.on('close', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
}
