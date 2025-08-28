const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: '.env.local' });

const prisma = new PrismaClient();

const systemConfigs = [
  

  // Courier Service Configuration
  // Note: DELHIVERY_API_KEY is now managed at client level through pickup locations
  {
    key: 'DELHIVERY_BASE_URL',
    value: process.env.DELHIVERY_BASE_URL || 'https://track.delhivery.com',
    type: 'string',
    category: 'courier',
    description: 'Delhivery API base URL',
    isEncrypted: false
  },
  {
    key: 'DELHIVERY_WEBHOOK_SECRET',
    value: process.env.DELHIVERY_WEBHOOK_SECRET || '',
    type: 'password',
    category: 'courier',
    description: 'Delhivery webhook secret for verification',
    isEncrypted: true
  },

  // AI/OpenAI Configuration
  {
    key: 'OPENAI_API_KEY',
    value: process.env.OPENAI_API_KEY || '',
    type: 'password',
    category: 'ai',
    description: 'OpenAI API key for address processing and AI features',
    isEncrypted: true
  },
  {
    key: 'OPENAI_MODEL',
    value: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    type: 'string',
    category: 'ai',
    description: 'OpenAI model to use for AI features',
    isEncrypted: false
  },

  // Note: Google Cloud configuration removed as it's no longer needed

  // Note: Email configuration removed as it's no longer needed

  // WhatsApp Configuration
  {
    key: 'FAST2SMS_WHATSAPP_API_KEY',
    value: process.env.FAST2SMS_WHATSAPP_API_KEY || '',
    type: 'password',
    category: 'whatsapp',
    description: 'Fast2SMS WhatsApp API key for sending order confirmation messages',
    isEncrypted: false
  },
  {
    key: 'FAST2SMS_WHATSAPP_MESSAGE_ID',
    value: process.env.FAST2SMS_WHATSAPP_MESSAGE_ID || '4697',
    type: 'string',
    category: 'whatsapp',
    description: 'Fast2SMS WhatsApp template message ID for order confirmations',
    isEncrypted: false
  },

  // Security Configuration
  {
    key: 'JWT_SECRET',
    value: process.env.JWT_SECRET || '',
    type: 'password',
    category: 'security',
    description: 'JWT secret key for authentication',
    isEncrypted: true
  },

  // Application Configuration
  {
    key: 'NEXT_PUBLIC_APP_NAME',
    value: process.env.NEXT_PUBLIC_APP_NAME || 'Scan2Ship - Accelerate Your Logistics',
    type: 'string',
    category: 'general',
    description: 'Application name displayed to users',
    isEncrypted: false
  },
  {
    key: 'NEXT_PUBLIC_APP_URL',
    value: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    type: 'string',
    category: 'general',
    description: 'Application base URL',
    isEncrypted: false
  },

  // File Upload Configuration
  {
    key: 'MAX_FILE_SIZE',
    value: process.env.MAX_FILE_SIZE || '5242880',
    type: 'number',
    category: 'general',
    description: 'Maximum file upload size in bytes (5MB)',
    isEncrypted: false
  },
  {
    key: 'ALLOWED_FILE_TYPES',
    value: process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/gif',
    type: 'string',
    category: 'general',
    description: 'Allowed file types for uploads',
    isEncrypted: false
  },

  // Rate Limiting
  {
    key: 'RATE_LIMIT_WINDOW',
    value: process.env.RATE_LIMIT_WINDOW || '900000',
    type: 'number',
    category: 'security',
    description: 'Rate limiting window in milliseconds (15 minutes)',
    isEncrypted: false
  },
  {
    key: 'RATE_LIMIT_MAX_REQUESTS',
    value: process.env.RATE_LIMIT_MAX_REQUESTS || '100',
    type: 'number',
    category: 'security',
    description: 'Maximum requests per rate limit window',
    isEncrypted: false
  },

  // Logging Configuration
  {
    key: 'LOG_LEVEL',
    value: process.env.LOG_LEVEL || 'info',
    type: 'string',
    category: 'general',
    description: 'Application log level',
    isEncrypted: false
  },
  {
    key: 'LOG_FILE_PATH',
    value: process.env.LOG_FILE_PATH || './logs/app.log',
    type: 'string',
    category: 'general',
    description: 'Log file path',
    isEncrypted: false
  }
];

async function seedSystemConfig() {
  try {
    console.log('🌱 Seeding system configuration...');

    for (const config of systemConfigs) {
      await prisma.system_config.upsert({
        where: { key: config.key },
        update: {
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted,
          updatedAt: new Date()
        },
        create: {
          ...config,
          id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ System configuration seeded successfully!');
    console.log(`📊 Total configurations: ${systemConfigs.length}`);

    // Display summary by category
    const categories = [...new Set(systemConfigs.map(c => c.category))];
    for (const category of categories) {
      const count = systemConfigs.filter(c => c.category === category).length;
      console.log(`   ${category}: ${count} configurations`);
    }

  } catch (error) {
    console.error('❌ Error seeding system configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSystemConfig();
