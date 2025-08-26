#!/usr/bin/env node

/**
 * Railway Database Helper Script
 * Provides easy commands for Railway database operations
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const RAILWAY_DB_URL = "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway";

function runCommand(command, description) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: RAILWAY_DB_URL }
    });
    console.log(`✅ ${description} completed successfully!`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

const command = process.argv[2];

switch (command) {
  case 'push':
    runCommand('npx prisma db push', 'Pushing schema to Railway database');
    break;
    
  case 'generate':
    runCommand('npx prisma generate', 'Generating Prisma client');
    break;
    
  case 'seed':
    runCommand('node scripts/seed-data.js', 'Seeding Railway database');
    break;
    
  case 'studio':
    runCommand('npx prisma studio', 'Opening Prisma Studio for Railway database');
    break;
    
  case 'migrate':
    console.log('🔄 Running full migration sequence...');
    runCommand('npx prisma generate', 'Generating Prisma client');
    runCommand('npx prisma db push', 'Pushing schema to Railway database');
    runCommand('node scripts/seed-data.js', 'Seeding Railway database');
    console.log('🎉 Migration completed successfully!');
    break;
    
  case 'backup':
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `railway_backup_${timestamp}.sql`;
    console.log(`💾 Creating backup: ${backupFile}`);
    runCommand(`pg_dump "${RAILWAY_DB_URL}" > ${backupFile}`, 'Creating Railway database backup');
    break;
    
  default:
    console.log('🚂 Railway Database Helper');
    console.log('==========================\n');
    console.log('Available commands:');
    console.log('  push     - Push schema to Railway database');
    console.log('  generate - Generate Prisma client');
    console.log('  seed     - Seed Railway database with sample data');
    console.log('  studio   - Open Prisma Studio for Railway database');
    console.log('  migrate  - Run full migration (generate + push + seed)');
    console.log('  backup   - Create backup of Railway database');
    console.log('\nUsage: node scripts/railway-db.js <command>');
    console.log('\nExample: node scripts/railway-db.js migrate');
}
