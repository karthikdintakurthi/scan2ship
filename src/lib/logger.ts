/**
 * Comprehensive Logging System
 * Provides structured logging with proper levels and security
 */

export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
  TRACE = 'TRACE'
}

export enum LogCategory {
  SECURITY = 'SECURITY',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  API = 'API',
  DATABASE = 'DATABASE',
  FILE_UPLOAD = 'FILE_UPLOAD',
  WEBHOOK = 'WEBHOOK',
  RATE_LIMIT = 'RATE_LIMIT',
  AUDIT = 'AUDIT',
  SYSTEM = 'SYSTEM'
}

interface LogEntry {
  level: LogLevel;
  category: LogCategory;
  message: string;
  timestamp: Date;
  userId?: string;
  clientId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  correlationId?: string;
  details?: Record<string, any>;
  stack?: string;
  tags?: string[];
}

interface LoggerConfig {
  minLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  enableAudit: boolean;
  maxFileSize: number;
  maxFiles: number;
  logDirectory: string;
  sensitiveFields: string[];
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: this.getMinLevelFromEnv(),
      enableConsole: process.env.NODE_ENV !== 'production',
      enableFile: process.env.NODE_ENV === 'production',
      enableDatabase: true,
      enableAudit: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      logDirectory: './logs',
      sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
      ...config
    };
  }

  private getMinLevelFromEnv(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'ERROR': return LogLevel.ERROR;
      case 'WARN': return LogLevel.WARN;
      case 'INFO': return LogLevel.INFO;
      case 'DEBUG': return LogLevel.DEBUG;
      case 'TRACE': return LogLevel.TRACE;
      default: return process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.ERROR, LogLevel.WARN, LogLevel.INFO, LogLevel.DEBUG, LogLevel.TRACE];
    const currentLevelIndex = levels.indexOf(this.config.minLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex <= currentLevelIndex;
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private formatLogEntry(entry: LogEntry): string {
    const sanitizedDetails = entry.details ? this.sanitizeData(entry.details) : undefined;
    
    const logObject = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      category: entry.category,
      message: entry.message,
      ...(entry.userId && { userId: entry.userId }),
      ...(entry.clientId && { clientId: entry.clientId }),
      ...(entry.sessionId && { sessionId: entry.sessionId }),
      ...(entry.ipAddress && { ipAddress: entry.ipAddress }),
      ...(entry.requestId && { requestId: entry.requestId }),
      ...(entry.correlationId && { correlationId: entry.correlationId }),
      ...(sanitizedDetails && { details: sanitizedDetails }),
      ...(entry.stack && { stack: entry.stack }),
      ...(entry.tags && { tags: entry.tags })
    };

    return JSON.stringify(logObject);
  }

  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const entries = [...this.logQueue];
      this.logQueue = [];

      for (const entry of entries) {
        await this.writeLog(entry);
      }
    } catch (error) {
      console.error('❌ Failed to process log queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    const formattedLog = this.formatLogEntry(entry);

    // Console logging
    if (this.config.enableConsole) {
      const consoleMethod = this.getConsoleMethod(entry.level);
      consoleMethod(formattedLog);
    }

    // File logging (in production)
    if (this.config.enableFile) {
      await this.writeToFile(formattedLog, entry.level);
    }

    // Database logging for audit events
    if (this.config.enableDatabase && this.shouldLogToDatabase(entry)) {
      await this.writeToDatabase(entry);
    }
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case LogLevel.ERROR:
        return console.error;
      case LogLevel.WARN:
        return console.warn;
      case LogLevel.INFO:
        return console.info;
      case LogLevel.DEBUG:
        return console.debug;
      case LogLevel.TRACE:
        return console.trace;
      default:
        return console.log;
    }
  }

  private shouldLogToDatabase(entry: LogEntry): boolean {
    // Log security and audit events to database
    return entry.category === LogCategory.SECURITY || 
           entry.category === LogCategory.AUDIT ||
           entry.level === LogLevel.ERROR ||
           entry.level === LogLevel.WARN;
  }

  private async writeToFile(log: string, level: LogLevel): Promise<void> {
    // This would be implemented with file system operations
    // For now, we'll just log to console
    console.log(`[FILE] ${log}`);
  }

  private async writeToDatabase(entry: LogEntry): Promise<void> {
    try {
      // This would write to the audit_logs table
      // Implementation depends on your database setup
      console.log(`[DATABASE] ${this.formatLogEntry(entry)}`);
    } catch (error) {
      console.error('❌ Failed to write log to database:', error);
    }
  }

  public log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: {
      userId?: string;
      clientId?: string;
      sessionId?: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
      correlationId?: string;
      tags?: string[];
    }
  ): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      category,
      message,
      timestamp: new Date(),
      details: details ? this.sanitizeData(details) : undefined,
      ...context
    };

    this.logQueue.push(entry);
    this.processLogQueue();
  }

  public error(
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.ERROR, category, message, details, context);
  }

  public warn(
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.WARN, category, message, details, context);
  }

  public info(
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.INFO, category, message, details, context);
  }

  public debug(
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.DEBUG, category, message, details, context);
  }

  public trace(
    category: LogCategory,
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.TRACE, category, message, details, context);
  }

  public security(
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.INFO, LogCategory.SECURITY, message, details, context);
  }

  public audit(
    message: string,
    details?: Record<string, any>,
    context?: any
  ): void {
    this.log(LogLevel.INFO, LogCategory.AUDIT, message, details, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logError = logger.error.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logTrace = logger.trace.bind(logger);
export const logSecurity = logger.security.bind(logger);
export const logAudit = logger.audit.bind(logger);
