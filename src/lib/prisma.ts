import { PrismaClient } from '@prisma/client';
import { config } from './config';

// Debug environment variables more explicitly
console.log('=== PRISMA INITIALIZATION DEBUG ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
console.log('DATABASE_URL from process.env:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('DATABASE_URL from config:', config.database.url ? 'SET' : 'NOT SET');
console.log('All env vars with DATABASE:', Object.keys(process.env).filter(key => key.includes('DATABASE')));
console.log('===================================');

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('CRITICAL: DATABASE_URL is missing from process.env');
  console.error('Available environment variables:', Object.keys(process.env));
  throw new Error('DATABASE_URL environment variable is not set');
}

// Use a single Prisma instance with proper connection management
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL, // Use process.env directly
    },
  },
  log: ['query', 'info', 'warn', 'error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
