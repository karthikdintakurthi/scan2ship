import { PrismaClient } from '@prisma/client';

// Environment-based logging configuration
const getLogLevels = () => {
  if (process.env.NODE_ENV === 'production') {
    // Production: Only log errors and warnings
    return ['warn', 'error'];
  } else if (process.env.NODE_ENV === 'test') {
    // Test: Minimal logging
    return ['error'];
  } else {
    // Development: Full logging for debugging
    return ['query', 'info', 'warn', 'error'];
  }
};

// Connection pool configuration
const getConnectionConfig = () => {
  const baseConfig = {
    // Connection pool settings
    pool: {
      min: 2,
      max: 10,
      acquireTimeoutMillis: 30000,
      createTimeoutMillis: 30000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 200,
    },
    // Query timeout
    query: {
      timeout: 20000,
    },
    // Transaction timeout
    transaction: {
      timeout: 30000,
    }
  };

  // Production-specific overrides
  if (process.env.NODE_ENV === 'production') {
    baseConfig.pool.max = 20; // More connections in production
    baseConfig.pool.min = 5;
  }

  return baseConfig;
};

// Global Prisma instance management
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with security configuration
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: getLogLevels(),
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Error handling
  errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
});

// Input validation function for security
function validateInputData(data: any) {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'apiKey'];
  
  for (const field of sensitiveFields) {
    if (data[field] && typeof data[field] === 'string') {
      // Check for potential SQL injection patterns
      const suspiciousPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter)\b)/i,
        /(\b(exec|execute|script|javascript|vbscript)\b)/i,
        /(\b(0x[0-9a-f]+)\b)/i,
        /(\b(declare|cast|convert)\b)/i
      ];
      
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(data[field])) {
          console.error(`🚨 Potential SQL injection detected in field: ${field}`);
          throw new Error('Invalid input data detected');
        }
      }
    }
  }
}

// Security wrapper for Prisma operations
export const securePrisma = {
  // Wrap create operations with input validation
  async create(model: string, data: any) {
    validateInputData(data);
    return (prisma as any)[model].create({ data });
  },

  // Wrap update operations with input validation
  async update(model: string, where: any, data: any) {
    validateInputData(data);
    return (prisma as any)[model].update({ where, data });
  },

  // Wrap upsert operations with input validation
  async upsert(model: string, where: any, create: any, update: any) {
    validateInputData(create);
    validateInputData(update);
    return (prisma as any)[model].upsert({ where, create, update });
  },

  // Expose all other Prisma methods
  ...prisma
};

// Connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log('✅ Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error closing database connection:', error);
  }
}

// Connection pool status
export function getConnectionPoolStatus() {
  return {
    environment: process.env.NODE_ENV,
    logLevels: getLogLevels(),
    connectionConfig: getConnectionConfig(),
    timestamp: new Date().toISOString()
  };
}

// Initialize connection pool
export async function initializeConnectionPool(): Promise<void> {
  try {
    // Test connection
    await checkDatabaseConnection();
    
    // Set up connection monitoring
    if (process.env.NODE_ENV === 'production') {
      // Monitor connection pool health every 5 minutes
      setInterval(async () => {
        const isHealthy = await checkDatabaseConnection();
        if (!isHealthy) {
          console.error('🚨 Database connection pool health check failed');
        }
      }, 5 * 60 * 1000);
    }
    
    console.log('✅ Database connection pool initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database connection pool:', error);
    throw error;
  }
}

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Handle process termination
process.on('beforeExit', async () => {
  await closeDatabaseConnection();
});

process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});
