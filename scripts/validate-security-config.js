#!/usr/bin/env node

/**
 * Security Configuration Validator
 * Validates that all required security environment variables are properly configured
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Required security environment variables
const REQUIRED_VARS = {
  // Critical security variables
  ENCRYPTION_KEY: {
    required: true,
    minLength: 32,
    description: 'Encryption key for sensitive data'
  },
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT signing secret'
  },
  NEXT_PUBLIC_APP_PASSWORD: {
    required: true,
    minLength: 12,
    description: 'Application access password'
  },
  NEXT_PUBLIC_UPI_ID: {
    required: true,
    minLength: 5,
    description: 'UPI ID for payments'
  },
  NEXT_PUBLIC_PAYEE_NAME: {
    required: true,
    minLength: 2,
    description: 'Payee name for payments'
  },
  // Database security
  DATABASE_URL: {
    required: true,
    minLength: 10,
    description: 'Database connection string'
  }
};

// Security patterns to check
const SECURITY_PATTERNS = {
  weakPasswords: [
    'password', '123456', 'admin', 'test', 'scan2ship',
    'vanitha', 'logistics', 'default', 'secret'
  ],
  weakKeys: [
    'vanitha-logistics-encryption-key-2024',
    'vanitha-logistics-super-secret-jwt-key-2024',
    'default', 'test', 'secret'
  ]
};

function validateEnvironment() {
  console.log('🔒 Security Configuration Validator');
  console.log('=====================================\n');

  let hasErrors = false;
  let hasWarnings = false;

  // Check required variables
  console.log('📋 Checking required environment variables...\n');

  for (const [varName, config] of Object.entries(REQUIRED_VARS)) {
    const value = process.env[varName];
    
    if (!value) {
      if (config.required) {
        console.log(`❌ ${varName}: MISSING - ${config.description}`);
        hasErrors = true;
      } else {
        console.log(`⚠️  ${varName}: NOT SET - ${config.description}`);
        hasWarnings = true;
      }
      continue;
    }

    if (value.length < config.minLength) {
      console.log(`❌ ${varName}: TOO SHORT (${value.length}/${config.minLength}) - ${config.description}`);
      hasErrors = true;
      continue;
    }

    // Check for weak values
    if (varName.includes('PASSWORD') || varName.includes('SECRET') || varName.includes('KEY')) {
      const isWeak = SECURITY_PATTERNS.weakPasswords.some(weak => 
        value.toLowerCase().includes(weak.toLowerCase())
      ) || SECURITY_PATTERNS.weakKeys.some(weak => 
        value.toLowerCase().includes(weak.toLowerCase())
      );

      if (isWeak) {
        console.log(`⚠️  ${varName}: WEAK VALUE DETECTED - Consider using a stronger value`);
        hasWarnings = true;
      } else {
        console.log(`✅ ${varName}: OK`);
      }
    } else {
      console.log(`✅ ${varName}: OK`);
    }
  }

  // Check for hardcoded secrets in code
  console.log('\n🔍 Checking for hardcoded secrets...\n');
  
  try {
    const srcDir = path.join(__dirname, '..', 'src');
    const files = getAllFiles(srcDir);
    
    let foundHardcoded = false;
    
    for (const file of files) {
      if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
        const content = fs.readFileSync(file, 'utf8');
        
        // Check for hardcoded API keys
        if (content.includes('sk_karthik_admin_m3t2z3kww7t')) {
          console.log(`❌ Hardcoded API key found in: ${file}`);
          foundHardcoded = true;
        }
        
        // Check for hardcoded passwords
        if (content.includes("'scan2ship'") && file.includes('PasswordScreen')) {
          console.log(`❌ Hardcoded password found in: ${file}`);
          foundHardcoded = true;
        }
        
        // Check for hardcoded UPI details
        if (content.includes("'scan2ship@ybl'") && !content.includes('process.env')) {
          console.log(`❌ Hardcoded UPI ID found in: ${file}`);
          foundHardcoded = true;
        }
      }
    }
    
    if (!foundHardcoded) {
      console.log('✅ No hardcoded secrets found in code');
    } else {
      hasErrors = true;
    }
  } catch (error) {
    console.log(`⚠️  Could not scan source files: ${error.message}`);
    hasWarnings = true;
  }

  // Security recommendations
  console.log('\n💡 Security Recommendations:\n');
  
  if (process.env.NODE_ENV === 'development') {
    console.log('⚠️  Running in development mode - ensure production uses secure values');
  }
  
  console.log('1. Use a password manager to generate strong passwords');
  console.log('2. Rotate secrets regularly (monthly for JWT, quarterly for encryption)');
  console.log('3. Never commit .env.local to version control');
  console.log('4. Use different values for development, staging, and production');
  console.log('5. Monitor for security updates and apply them promptly');

  // Final result
  console.log('\n📊 Security Validation Result:');
  console.log('==============================');
  
  if (hasErrors) {
    console.log('❌ VALIDATION FAILED - Critical security issues found');
    console.log('   Please fix the errors above before deploying to production');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above');
    console.log('   Consider addressing warnings for better security');
    process.exit(0);
  } else {
    console.log('✅ VALIDATION PASSED - Security configuration looks good');
    console.log('   Remember to regularly review and update security settings');
    process.exit(0);
  }
}

function getAllFiles(dir) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Run validation
if (require.main === module) {
  validateEnvironment();
}

module.exports = { validateEnvironment };
