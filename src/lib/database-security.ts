/**
 * Database Security Utilities
 * Provides safe database operations and SQL injection prevention
 */

import { prisma } from './prisma';

export interface SafeQueryOptions {
  maxResults?: number;
  timeout?: number;
  allowRawQueries?: boolean;
  sanitizeInputs?: boolean;
}

export interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  executionTime?: number;
}

/**
 * Safe database query executor with parameter validation
 */
export class SafeDatabaseQuery {
  private static instance: SafeDatabaseQuery;
  private queryCache = new Map<string, { timestamp: number; data: any }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  static getInstance(): SafeDatabaseQuery {
    if (!SafeDatabaseQuery.instance) {
      SafeDatabaseQuery.instance = new SafeDatabaseQuery();
    }
    return SafeDatabaseQuery.instance;
  }

  /**
   * Execute a safe Prisma query with validation
   */
  async execute<T>(
    operation: () => Promise<T>,
    options: SafeQueryOptions = {}
  ): Promise<QueryResult<T>> {
    const startTime = Date.now();
    
    try {
      // Validate options
      this.validateQueryOptions(options);
      
      // Execute query with timeout
      const result = await Promise.race([
        operation(),
        this.createTimeout(options.timeout || 20000)
      ]);
      
      const executionTime = Date.now() - startTime;
      
      // Log slow queries
      if (executionTime > 1000) {
        console.warn(`🐌 Slow query detected: ${executionTime}ms`);
      }
      
      return {
        success: true,
        data: result,
        executionTime
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Log security-related errors
      if (error instanceof Error && error.message.includes('Invalid input data')) {
        console.error('🚨 Security violation detected:', error.message);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * Execute a cached query for read operations
   */
  async executeCached<T>(
    key: string,
    operation: () => Promise<T>,
    options: SafeQueryOptions = {}
  ): Promise<QueryResult<T>> {
    // Check cache first
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return {
        success: true,
        data: cached.data,
        executionTime: 0
      };
    }
    
    // Execute and cache result
    const result = await this.execute(operation, options);
    if (result.success && result.data) {
      this.queryCache.set(key, {
        timestamp: Date.now(),
        data: result.data
      });
    }
    
    return result;
  }

  /**
   * Safe raw query execution (use with extreme caution)
   */
  async executeRaw<T>(
    query: string,
    params: any[] = [],
    options: SafeQueryOptions = {}
  ): Promise<QueryResult<T>> {
    if (!options.allowRawQueries) {
      return {
        success: false,
        error: 'Raw queries are not allowed in this context'
      };
    }
    
    // Validate query string
    if (!this.isQuerySafe(query)) {
      return {
        success: false,
        error: 'Query contains potentially unsafe patterns'
      };
    }
    
    // Validate parameters
    if (!this.areParametersSafe(params)) {
      return {
        success: false,
        error: 'Query parameters contain potentially unsafe values'
      };
    }
    
    return this.execute(async () => {
      return await prisma.$queryRawUnsafe(query, ...params);
    }, options);
  }

  /**
   * Validate query options
   */
  private validateQueryOptions(options: SafeQueryOptions): void {
    if (options.maxResults && options.maxResults > 1000) {
      throw new Error('Maximum results limit exceeded');
    }
    
    if (options.timeout && options.timeout > 60000) {
      throw new Error('Query timeout too long');
    }
  }

  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Query timeout')), ms);
    });
  }

  /**
   * Check if a raw query is safe
   */
  private isQuerySafe(query: string): boolean {
    const dangerousPatterns = [
      /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
      /(\b(exec|execute|script|javascript|vbscript)\b)/i,
      /(\b(0x[0-9a-f]+)\b)/i,
      /(\b(declare|cast|convert)\b)/i,
      /(\b(sys\.|information_schema\.|pg_))/i,
      /(\b(backup|restore|shutdown|kill)\b)/i
    ];
    
    return !dangerousPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Check if parameters are safe
   */
  private areParametersSafe(params: any[]): boolean {
    return params.every(param => {
      if (typeof param === 'string') {
        return !this.isQuerySafe(param); // Reuse the same validation
      }
      return true; // Non-string parameters are generally safe
    });
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const activeEntries = Array.from(this.queryCache.entries())
      .filter(([_, value]) => now - value.timestamp < this.CACHE_TTL);
    
    return {
      totalEntries: this.queryCache.size,
      activeEntries: activeEntries.length,
      cacheSize: this.queryCache.size,
      cacheTTL: this.CACHE_TTL
    };
  }
}

/**
 * Input sanitization utilities
 */
export class InputSanitizer {
  /**
   * Sanitize string input
   */
  static sanitizeString(input: string, maxLength: number = 1000): string {
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    // Remove null bytes and control characters
    let sanitized = input
      .replace(/\0/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '')
      .trim();
    
    // Limit length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }
    
    return sanitized;
  }

  /**
   * Sanitize email input
   */
  static sanitizeEmail(email: string): string {
    const sanitized = this.sanitizeString(email, 254);
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitized)) {
      throw new Error('Invalid email format');
    }
    
    return sanitized.toLowerCase();
  }

  /**
   * Sanitize numeric input
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number {
    const num = Number(input);
    
    if (isNaN(num)) {
      throw new Error('Invalid numeric input');
    }
    
    if (min !== undefined && num < min) {
      throw new Error(`Number must be at least ${min}`);
    }
    
    if (max !== undefined && num > max) {
      throw new Error(`Number must be at most ${max}`);
    }
    
    return num;
  }

  /**
   * Sanitize object input
   */
  static sanitizeObject<T extends Record<string, any>>(
    obj: T,
    allowedFields: (keyof T)[],
    fieldValidators: Partial<Record<keyof T, (value: any) => any>>
  ): T {
    const sanitized: Partial<T> = {};
    
    for (const field of allowedFields) {
      if (obj[field] !== undefined) {
        const validator = fieldValidators[field];
        if (validator) {
          try {
            sanitized[field] = validator(obj[field]);
          } catch (error) {
            throw new Error(`Invalid value for field ${String(field)}: ${error}`);
          }
        } else {
          sanitized[field] = obj[field];
        }
      }
    }
    
    return sanitized as T;
  }
}

/**
 * Database connection utilities
 */
export class DatabaseConnectionManager {
  /**
   * Get connection pool status
   */
  static async getStatus() {
    const isConnected = await prisma.checkDatabaseConnection();
    const poolStatus = prisma.getConnectionPoolStatus();
    
    return {
      connected: isConnected,
      pool: poolStatus,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Initialize database connections
   */
  static async initialize() {
    try {
      await prisma.initializeConnectionPool();
      return { success: true, message: 'Database connections initialized' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Close database connections
   */
  static async close() {
    try {
      await prisma.closeDatabaseConnection();
      return { success: true, message: 'Database connections closed' };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

// Export singleton instance
export const safeQuery = SafeDatabaseQuery.getInstance();
