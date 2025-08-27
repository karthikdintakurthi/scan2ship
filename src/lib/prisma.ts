import { PrismaClient } from '@prisma/client';
import { config, validateConfig } from './config';

// Validate configuration before initializing Prisma
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error);
  throw error;
}

// Debug environment variables
console.log('Prisma initialization - Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  DATABASE_URL: config.database.url ? 'SET' : 'NOT SET',
  DATABASE_URL_LENGTH: config.database.url?.length || 0
});

// Use a single Prisma instance with proper connection management
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: config.database.url,
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
