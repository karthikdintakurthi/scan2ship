#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Order Management System Database...\n');

// Check if .env file exists
if (!fs.existsSync('.env')) {
  console.log('❌ .env file not found!');
  console.log('Please create a .env file with your database configuration.');
  console.log('You can copy from .env.example and update the values.\n');
  process.exit(1);
}

try {
  // Generate Prisma client
  console.log('📦 Generating Prisma client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma client generated successfully!\n');

  // Check if database is accessible
  console.log('🔍 Checking database connection...');
  try {
    execSync('npx prisma db pull', { stdio: 'pipe' });
    console.log('✅ Database connection successful!\n');
  } catch (error) {
    console.log('⚠️  Database connection failed. This might be expected if the database is empty.\n');
  }

  // Create and apply migrations
  console.log('🗄️  Setting up database schema...');
  execSync('npx prisma migrate dev --name init', { stdio: 'inherit' });
  console.log('✅ Database schema created successfully!\n');

  console.log('🎉 Database setup completed!');
  console.log('\nNext steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Open http://localhost:3000 in your browser');
  console.log('3. Start creating orders!');
  console.log('\nOptional:');
  console.log('- View your database: npx prisma studio');
  console.log('- Reset database: npx prisma migrate reset');

} catch (error) {
  console.error('❌ Error during database setup:', error.message);
  console.log('\nTroubleshooting:');
  console.log('1. Make sure PostgreSQL is running');
  console.log('2. Check your DATABASE_URL in .env file');
  console.log('3. Ensure the database exists');
  console.log('4. Verify your database credentials');
  process.exit(1);
}
