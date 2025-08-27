// Environment configuration with validation
export const config = {
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret',
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
};

// Validate required environment variables
export function validateConfig() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing);
    console.error('Available environment variables:', Object.keys(process.env));
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  console.log('Environment configuration validated successfully');
  return true;
}

// Export for use in other files
export default config;
