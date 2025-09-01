import { jwtConfig } from './jwt-config';

export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: jwtConfig.secret,
    options: jwtConfig.options,
  },
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'Vanitha Logistics',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  delhivery: {
    baseUrl: process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com',
    webhookSecret: process.env.DELHIVERY_WEBHOOK_SECRET,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },
  whatsapp: {
    apiKey: process.env.FAST2SMS_WHATSAPP_API_KEY,
    messageId: process.env.FAST2SMS_WHATSAPP_MESSAGE_ID,
  },
  // Production environment checks
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  
  // Additional security checks for production
  validateProductionConfig() {
    if (process.env.NODE_ENV === 'production' &&
        !process.env.VERCEL_BUILD) {
      
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required in production');
      }
      
      if (!process.env.ENCRYPTION_KEY) {
        throw new Error('ENCRYPTION_KEY is required in production');
      }
      
      if (process.env.DEBUG) {
        console.warn('DEBUG is enabled in production - consider removing');
      }
    }
  }
};

// Validate required environment variables only at runtime
export function validateConfig() {
  // Skip validation during build time completely
  if (process.env.NODE_ENV === 'production' && 
      typeof window === 'undefined' && 
      !process.env.VERCEL_BUILD) {
    const required = ['DATABASE_URL', 'JWT_SECRET'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error('Missing required environment variables:', missing);
      console.error('Available environment variables:', Object.keys(process.env));
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    console.log('Environment configuration validated successfully');
  }
  
  return true;
}

// Export for use in other files
export default config;
