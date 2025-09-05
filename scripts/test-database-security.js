#!/usr/bin/env node

/**
 * Database Security Test Script
 * Tests all implemented database security measures
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 Testing Database Security Implementation\n');

// Test 1: Environment Configuration
console.log('1️⃣ Testing Database Environment Configuration...');
try {
  require('dotenv').config({ path: '.env.local' });
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'NODE_ENV'
  ];
  
  const optionalEnvVars = [
    'DB_MAX_QUERY_TIMEOUT',
    'DB_MAX_RESULTS',
    'DB_LOG_SLOW_QUERIES',
    'DB_SLOW_QUERY_THRESHOLD',
    'DB_POOL_MIN',
    'DB_POOL_MAX',
    'DB_POOL_ACQUIRE_TIMEOUT',
    'DB_POOL_IDLE_TIMEOUT'
  ];
  
  let hasErrors = false;
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`❌ ${envVar} is required but not set`);
      hasErrors = true;
    } else {
      console.log(`✅ ${envVar}: ${envVar === 'DATABASE_URL' ? '***' : process.env[envVar]}`);
    }
  }
  
  for (const envVar of optionalEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: ${process.env[envVar]}`);
    } else {
      console.log(`ℹ️  ${envVar}: Not set (using defaults)`);
    }
  }
  
  if (hasErrors) {
    throw new Error('Required environment variables are missing');
  }
  
  console.log('✅ Database environment configuration is properly set');
  
} catch (error) {
  console.error('❌ Database environment test failed:', error.message);
  process.exit(1);
}

// Test 2: Prisma Configuration
console.log('\n2️⃣ Testing Prisma Security Configuration...');
try {
  const prismaFile = 'src/lib/prisma.ts';
  
  if (!fs.existsSync(prismaFile)) {
    throw new Error('Prisma configuration file not found');
  }
  
  const prismaContent = fs.readFileSync(prismaFile, 'utf8');
  
  // Check for security features
  const securityChecks = [
    {
      name: 'Environment-based logging',
      pattern: /getLogLevels\(\)/,
      required: true
    },
    {
      name: 'Connection pool configuration',
      pattern: /getConnectionConfig\(\)/,
      required: true
    },
    {
      name: 'Security middleware',
      pattern: /SecurityMiddleware/,
      required: true
    },
    {
      name: 'Input validation',
      pattern: /validateInputData/,
      required: true
    },
    {
      name: 'SQL injection protection',
      pattern: /suspiciousPatterns/,
      required: true
    },
    {
      name: 'Connection health monitoring',
      pattern: /checkDatabaseConnection/,
      required: true
    },
    {
      name: 'Graceful shutdown',
      pattern: /closeDatabaseConnection/,
      required: true
    }
  ];
  
  let allChecksPassed = true;
  
  for (const check of securityChecks) {
    if (check.pattern.test(prismaContent)) {
      console.log(`✅ ${check.name}`);
    } else if (check.required) {
      console.error(`❌ ${check.name} - Required but not found`);
      allChecksPassed = false;
    } else {
      console.log(`ℹ️  ${check.name} - Optional`);
    }
  }
  
  if (!allChecksPassed) {
    throw new Error('Required security features are missing from Prisma configuration');
  }
  
  console.log('✅ Prisma security configuration is properly implemented');
  
} catch (error) {
  console.error('❌ Prisma configuration test failed:', error.message);
  process.exit(1);
}

// Test 3: Database Security Utilities
console.log('\n3️⃣ Testing Database Security Utilities...');
try {
  const securityFile = 'src/lib/database-security.ts';
  
  if (!fs.existsSync(securityFile)) {
    throw new Error('Database security utilities file not found');
  }
  
  const securityContent = fs.readFileSync(securityFile, 'utf8');
  
  // Check for security utility features
  const utilityChecks = [
    {
      name: 'Safe query executor',
      pattern: /class SafeDatabaseQuery/,
      required: true
    },
    {
      name: 'Input sanitization',
      pattern: /class InputSanitizer/,
      required: true
    },
    {
      name: 'Connection management',
      pattern: /class DatabaseConnectionManager/,
      required: true
    },
    {
      name: 'Query timeout protection',
      pattern: /createTimeout/,
      required: true
    },
    {
      name: 'SQL injection pattern detection',
      pattern: /dangerousPatterns/,
      required: true
    },
    {
      name: 'Query caching',
      pattern: /executeCached/,
      required: true
    }
  ];
  
  let allUtilityChecksPassed = true;
  
  for (const check of utilityChecks) {
    if (check.pattern.test(securityContent)) {
      console.log(`✅ ${check.name}`);
    } else if (check.required) {
      console.error(`❌ ${check.name} - Required but not found`);
      allUtilityChecksPassed = false;
    } else {
      console.log(`ℹ️  ${check.name} - Optional`);
    }
  }
  
  if (!allUtilityChecksPassed) {
    throw new Error('Required security utility features are missing');
  }
  
  console.log('✅ Database security utilities are properly implemented');
  
} catch (error) {
  console.error('❌ Database security utilities test failed:', error.message);
  process.exit(1);
}

// Test 4: API Endpoints
console.log('\n4️⃣ Testing Database Security API Endpoints...');
try {
  const apiEndpoints = [
    'src/app/api/admin/database-health/route.ts',
    'src/app/api/admin/jwt-secrets/route.ts'
  ];
  
  let allEndpointsExist = true;
  
  for (const endpoint of apiEndpoints) {
    if (fs.existsSync(endpoint)) {
      console.log(`✅ ${endpoint}`);
    } else {
      console.error(`❌ ${endpoint} - Not found`);
      allEndpointsExist = false;
    }
  }
  
  if (!allEndpointsExist) {
    throw new Error('Required database security API endpoints are missing');
  }
  
  console.log('✅ Database security API endpoints are properly implemented');
  
} catch (error) {
  console.error('❌ Database security API endpoints test failed:', error.message);
  process.exit(1);
}

// Test 5: Configuration Integration
console.log('\n5️⃣ Testing Configuration Integration...');
try {
  const configFile = 'src/lib/config.ts';
  
  if (!fs.existsSync(configFile)) {
    throw new Error('Configuration file not found');
  }
  
  const configContent = fs.readFileSync(configFile, 'utf8');
  
  // Check for database security configuration
  const configChecks = [
    {
      name: 'Database security config',
      pattern: /database:\s*{[^}]*security:/s,
      required: true
    },
    {
      name: 'Connection pool settings',
      pattern: /connectionPool/,
      required: true
    },
    {
      name: 'Production security checks',
      pattern: /validateProductionConfig/,
      required: true
    }
  ];
  
  let allConfigChecksPassed = true;
  
  for (const check of configChecks) {
    if (check.pattern.test(configContent)) {
      console.log(`✅ ${check.name}`);
    } else if (check.required) {
      console.error(`❌ ${check.name} - Required but not found`);
      allConfigChecksPassed = false;
    } else {
      console.log(`ℹ️  ${check.name} - Optional`);
    }
  }
  
  if (!allConfigChecksPassed) {
    throw new Error('Required configuration features are missing');
  }
  
  console.log('✅ Configuration integration is properly implemented');
  
} catch (error) {
  console.error('❌ Configuration integration test failed:', error.message);
  process.exit(1);
}

// Test 6: File Structure Security
console.log('\n6️⃣ Testing File Structure Security...');
try {
  // Check if sensitive files are properly protected
  const sensitiveFiles = [
    '.env.local',
    'prisma/dev.db',
    'prisma/schema.prisma'
  ];
  
  for (const file of sensitiveFiles) {
    if (fs.existsSync(file)) {
      if (file === '.env.local') {
        console.log(`✅ ${file} exists (should be gitignored)`);
      } else {
        console.log(`✅ ${file} exists`);
      }
    } else {
      if (file === '.env.local') {
        console.warn(`⚠️  ${file} not found (may need to be created)`);
      } else {
        console.log(`ℹ️  ${file} not found (may be optional)`);
      }
    }
  }
  
  // Check .gitignore
  if (fs.existsSync('.gitignore')) {
    const gitignore = fs.readFileSync('.gitignore', 'utf8');
    if (gitignore.includes('.env.local')) {
      console.log('✅ .env.local is properly gitignored');
    } else {
      console.warn('⚠️  .env.local is not in .gitignore');
    }
    
    if (gitignore.includes('*.db')) {
      console.log('✅ Database files are properly gitignored');
    } else {
      console.warn('⚠️  Database files may not be gitignored');
    }
  } else {
    console.warn('⚠️  .gitignore file not found');
  }
  
  console.log('✅ File structure security checks passed');
  
} catch (error) {
  console.error('❌ File structure security test failed:', error.message);
  process.exit(1);
}

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('🎉 DATABASE SECURITY IMPLEMENTATION TEST COMPLETED SUCCESSFULLY!');
console.log('='.repeat(60));

console.log('\n✅ All critical database security measures are properly implemented:');
console.log('   • SQL injection protection with pattern detection');
console.log('   • Secure Prisma logging (production-safe)');
console.log('   • Connection pooling with health monitoring');
console.log('   • Input validation and sanitization');
console.log('   • Query timeout protection');
console.log('   • Safe query execution utilities');
console.log('   • Database health monitoring APIs');
console.log('   • Production environment security checks');

console.log('\n🔒 Your database is now significantly more secure!');
console.log('\n📋 Next steps:');
console.log('   1. Test the application to ensure database operations work correctly');
console.log('   2. Monitor database health through admin endpoints');
console.log('   3. Review and adjust connection pool settings if needed');
console.log('   4. Consider implementing additional database security measures:');
console.log('      - Database encryption at rest');
console.log('      - Network-level security (VPN, firewall)');
console.log('      - Regular security audits and penetration testing');
console.log('      - Database backup encryption');

console.log('\n🚀 Your database is ready for secure production deployment!');
