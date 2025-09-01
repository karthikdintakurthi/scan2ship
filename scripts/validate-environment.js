#!/usr/bin/env node

/**
 * Environment Validation Script
 * Validates that all required environment variables are properly set
 * Run this script before starting the application to ensure security
 */

require('dotenv').config({ path: '.env.local' });

const requiredEnvVars = {
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT secret for authentication (must be at least 32 characters)'
  },
  ENCRYPTION_KEY: {
    required: true,
    minLength: 32,
    description: 'Encryption key for sensitive data (must be at least 32 characters)'
  },
  DATABASE_URL: {
    required: true,
    description: 'Database connection string'
  },
  OPENAI_API_KEY: {
    required: false,
    description: 'OpenAI API key for AI features'
  },
  FAST2SMS_WHATSAPP_API_KEY: {
    required: false,
    description: 'Fast2SMS WhatsApp API key'
  }
};

const weakSecrets = [
  'fallback-secret',
  'your-secret-here',
  'change-me',
  'secret',
  'password',
  '123456',
  'admin',
  'test',
  'vanitha-logistics-super-secret-jwt-key-2024',
  'vanitha-logistics-encryption-key-2024'
];

function validateEnvironment() {
  console.log('🔒 Validating environment variables...\n');
  
  let hasErrors = false;
  let hasWarnings = false;
  
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    
    if (config.required && !value) {
      console.error(`❌ ERROR: ${key} is required but not set`);
      console.error(`   ${config.description}`);
      hasErrors = true;
      continue;
    }
    
    if (!value) {
      console.warn(`⚠️  WARNING: ${key} is not set`);
      console.warn(`   ${config.description}`);
      hasWarnings = true;
      continue;
    }
    
    // Check minimum length for secrets
    if (config.minLength && value.length < config.minLength) {
      console.error(`❌ ERROR: ${key} must be at least ${config.minLength} characters long`);
      console.error(`   Current length: ${value.length}`);
      hasErrors = true;
      continue;
    }
    
    // Check for weak secrets
    if (key.includes('SECRET') || key.includes('KEY')) {
      if (weakSecrets.includes(value.toLowerCase())) {
        console.error(`❌ ERROR: ${key} uses a weak, common value`);
        console.error(`   Please use a strong, unique value`);
        hasErrors = true;
        continue;
      }
    }
    
    console.log(`✅ ${key}: ${'*'.repeat(Math.min(value.length, 8))}${value.length > 8 ? '...' : ''}`);
  }
  
  // Check for development vs production
  const nodeEnv = process.env.NODE_ENV || 'development';
  console.log(`\n🌍 Environment: ${nodeEnv}`);
  
  if (nodeEnv === 'production') {
    console.log('🚨 PRODUCTION MODE: All security checks are enforced');
    
    // Additional production checks
    if (process.env.DEBUG) {
      console.warn('⚠️  WARNING: DEBUG is set in production - consider removing');
      hasWarnings = true;
    }
    
    if (process.env.NEXT_TELEMETRY_DISABLED !== '1') {
      console.warn('⚠️  WARNING: Telemetry is enabled in production');
      hasWarnings = true;
    }
  } else {
    console.log('🔧 Development mode: Some security checks are relaxed');
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (hasErrors) {
    console.error('❌ Environment validation FAILED');
    console.error('Please fix the errors above before starting the application');
    process.exit(1);
  } else if (hasWarnings) {
    console.warn('⚠️  Environment validation completed with warnings');
    console.warn('Please review the warnings above');
  } else {
    console.log('✅ Environment validation PASSED');
    console.log('All required variables are properly configured');
  }
  
  return !hasErrors;
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };
