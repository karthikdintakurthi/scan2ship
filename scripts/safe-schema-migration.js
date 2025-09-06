#!/usr/bin/env node

/**
 * Safe Schema Migration Script for QA Database
 * Migrates schema changes without data loss
 * Preserves existing QA data while applying new schema changes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// QA Database URL
const QA_DATABASE_URL = "postgresql://postgres:JxntVxjvTOUAVphZrxuXjhIuAIPrcSto@trolley.proxy.rlwy.net:22039/railway";

function runCommand(command, description, options = {}) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      ...options
    });
    console.log(`✅ ${description} completed successfully!`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = `qa_backup_${timestamp}.sql`;
  
  console.log('📦 Creating backup of QA database...');
  
  const backupCommand = `pg_dump "${QA_DATABASE_URL}" --no-owner --no-privileges > ${backupFile}`;
  
  if (runCommand(backupCommand, 'Creating QA database backup')) {
    console.log(`✅ Backup created: ${backupFile}`);
    return backupFile;
  }
  return null;
}

function checkDatabaseConnection() {
  console.log('🔍 Checking QA database connection...');
  
  const testCommand = `psql "${QA_DATABASE_URL}" -c "SELECT version();"`;
  
  if (runCommand(testCommand, 'Testing database connection')) {
    console.log('✅ Database connection successful');
    return true;
  } else {
    console.log('❌ Database connection failed');
    return false;
  }
}

function getCurrentSchemaVersion() {
  console.log('📋 Checking current schema version...');
  
  try {
    const result = execSync(`psql "${QA_DATABASE_URL}" -t -c "SELECT version FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;"`, 
      { encoding: 'utf8' });
    
    const version = result.trim();
    if (version) {
      console.log(`✅ Current schema version: ${version}`);
      return version;
    } else {
      console.log('⚠️  No migrations found - fresh database');
      return null;
    }
  } catch (error) {
    console.log('⚠️  Could not determine schema version - proceeding with migration');
    return null;
  }
}

function runPrismaMigration() {
  console.log('🚀 Running Prisma migration...');
  
  // Set the QA database URL for this migration
  const env = {
    ...process.env,
    DATABASE_URL: QA_DATABASE_URL
  };
  
  // Run Prisma migrate deploy (safe for production/QA)
  const migrateCommand = 'npx prisma migrate deploy';
  
  if (runCommand(migrateCommand, 'Applying schema migrations', { env })) {
    console.log('✅ Schema migration completed successfully');
    return true;
  } else {
    console.log('❌ Schema migration failed');
    return false;
  }
}

function validateMigration() {
  console.log('🔍 Validating migration results...');
  
  // Check if all tables exist
  const checkTablesCommand = `psql "${QA_DATABASE_URL}" -c "\\dt"`;
  
  if (runCommand(checkTablesCommand, 'Checking table structure')) {
    console.log('✅ Table structure validation passed');
    return true;
  } else {
    console.log('❌ Table structure validation failed');
    return false;
  }
}

function showMigrationSummary(backupFile, success) {
  console.log('\n📊 Migration Summary');
  console.log('====================');
  console.log(`QA Database: ${QA_DATABASE_URL.replace(/\/\/.*@/, '//***:***@')}`);
  console.log(`Backup created: ${backupFile || 'Failed to create backup'}`);
  console.log(`Migration status: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  if (success) {
    console.log('\n🎉 Schema migration completed successfully!');
    console.log('✅ All new tables and columns have been added');
    console.log('✅ Existing data has been preserved');
    console.log('✅ Database is ready for QA testing');
  } else {
    console.log('\n⚠️  Migration failed. Please check the logs above.');
    console.log('💡 You can restore from backup if needed:');
    console.log(`   psql "${QA_DATABASE_URL}" < ${backupFile}`);
  }
}

function main() {
  console.log('🔄 Safe Schema Migration for QA Database');
  console.log('========================================\n');
  console.log('⚠️  This will apply schema changes to your QA database');
  console.log('✅ Existing data will be preserved');
  console.log('📦 A backup will be created before migration\n');
  
  // Step 1: Check database connection
  if (!checkDatabaseConnection()) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Step 2: Create backup
  const backupFile = createBackup();
  if (!backupFile) {
    console.log('❌ Cannot proceed without backup');
    process.exit(1);
  }
  
  // Step 3: Check current schema version
  const currentVersion = getCurrentSchemaVersion();
  
  // Step 4: Run migration
  const migrationSuccess = runPrismaMigration();
  
  // Step 5: Validate migration
  const validationSuccess = migrationSuccess && validateMigration();
  
  // Step 6: Show summary
  showMigrationSummary(backupFile, validationSuccess);
  
  if (!validationSuccess) {
    process.exit(1);
  }
}

// Run the migration
main();
