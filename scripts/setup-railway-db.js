#!/usr/bin/env node

/**
 * Railway Database Migration Setup Script
 * This script helps migrate from local database to Railway PostgreSQL
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚂 Railway Database Migration Setup');
console.log('=====================================\n');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  console.log('Please create .env.local file first by copying from env-template.env');
  process.exit(1);
}

// Read current DATABASE_URL
const envContent = fs.readFileSync(envPath, 'utf8');
const currentDbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);

if (!currentDbUrlMatch) {
  console.log('❌ DATABASE_URL not found in .env.local');
  process.exit(1);
}

const currentDbUrl = currentDbUrlMatch[1];
console.log('📊 Current Database URL:', currentDbUrl);

if (currentDbUrl.includes('railway.app')) {
  console.log('✅ Already using Railway database!');
  process.exit(0);
}

console.log('\n📋 Steps to migrate to Railway:');
console.log('1. Go to https://railway.app');
console.log('2. Create a new project');
console.log('3. Add a PostgreSQL database');
console.log('4. Copy the connection URL from Railway');
console.log('5. Update your .env.local file with the new DATABASE_URL');
console.log('6. Run this script again to migrate data\n');

console.log('🔧 Commands to run after updating DATABASE_URL:');
console.log('npm run db:generate    # Generate Prisma client');
console.log('npm run db:push        # Push schema to Railway');
console.log('npm run db:seed        # Seed initial data');

console.log('\n💡 Optional: To migrate existing data from local database:');
console.log('1. Export data: pg_dump -h localhost -U karthiknaidudintakurthi vanitha-logistics > backup.sql');
console.log('2. Import to Railway: psql [RAILWAY_DATABASE_URL] < backup.sql');

console.log('\n🎯 Next steps:');
console.log('- Update your .env.local with Railway DATABASE_URL');
console.log('- Run: node scripts/setup-railway-db.js');
console.log('- Deploy your app to Railway or Vercel with the new DATABASE_URL');
