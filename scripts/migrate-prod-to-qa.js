#!/usr/bin/env node

/**
 * Production to QA Database Migration Script
 * Exports data from production database and imports to QA database
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your actual database URLs
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL || "your_production_database_url_here";
const QA_DATABASE_URL = process.env.QA_DATABASE_URL || "your_qa_database_url_here";

// Tables to migrate (in order of dependencies)
const TABLES_TO_MIGRATE = [
  'clients',
  'users',
  'client_config',
  'client_credit_costs',
  'client_credits',
  'client_order_configs',
  'pickup_locations',
  'orders',
  'order_items',
  'transactions',
  'credit_transactions',
  'analytics_events'
];

function runCommand(command, description, env = process.env) {
  console.log(`\n🔧 ${description}...`);
  try {
    execSync(command, { 
      stdio: 'inherit',
      env: { ...env }
    });
    console.log(`✅ ${description} completed successfully!`);
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    process.exit(1);
  }
}

function createBackupDirectory() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `migration_backup_${timestamp}`;
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  return backupDir;
}

function exportTable(tableName, backupDir) {
  const backupFile = path.join(backupDir, `${tableName}.sql`);
  
  console.log(`📤 Exporting table: ${tableName}`);
  
  // Export table structure and data
  const exportCommand = `pg_dump "${PROD_DATABASE_URL}" --table=${tableName} --data-only --no-owner --no-privileges > ${backupFile}`;
  
  try {
    execSync(exportCommand, { stdio: 'inherit' });
    console.log(`✅ Exported ${tableName} to ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error(`❌ Failed to export ${tableName}:`, error.message);
    return null;
  }
}

function importTable(tableName, backupFile) {
  console.log(`📥 Importing table: ${tableName}`);
  
  if (!fs.existsSync(backupFile)) {
    console.error(`❌ Backup file not found: ${backupFile}`);
    return false;
  }
  
  // Import table data
  const importCommand = `psql "${QA_DATABASE_URL}" < ${backupFile}`;
  
  try {
    execSync(importCommand, { stdio: 'inherit' });
    console.log(`✅ Imported ${tableName} successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to import ${tableName}:`, error.message);
    return false;
  }
}

function migrateData() {
  console.log('🚀 Starting Production to QA Database Migration');
  console.log('================================================\n');
  
  // Validate database URLs
  if (PROD_DATABASE_URL === "your_production_database_url_here" || 
      QA_DATABASE_URL === "your_qa_database_url_here") {
    console.error('❌ Please set PROD_DATABASE_URL and QA_DATABASE_URL environment variables');
    console.error('Example:');
    console.error('export PROD_DATABASE_URL="postgresql://user:pass@host:port/prod_db"');
    console.error('export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
    process.exit(1);
  }
  
  // Create backup directory
  const backupDir = createBackupDirectory();
  console.log(`📁 Created backup directory: ${backupDir}`);
  
  // Step 1: Export all tables from production
  console.log('\n📤 Step 1: Exporting data from production database...');
  const exportedFiles = [];
  
  for (const table of TABLES_TO_MIGRATE) {
    const backupFile = exportTable(table, backupDir);
    if (backupFile) {
      exportedFiles.push({ table, file: backupFile });
    }
  }
  
  // Step 2: Import data to QA database
  console.log('\n📥 Step 2: Importing data to QA database...');
  
  let successCount = 0;
  for (const { table, file } of exportedFiles) {
    if (importTable(table, file)) {
      successCount++;
    }
  }
  
  // Step 3: Summary
  console.log('\n📊 Migration Summary');
  console.log('====================');
  console.log(`Total tables: ${TABLES_TO_MIGRATE.length}`);
  console.log(`Successfully migrated: ${successCount}`);
  console.log(`Failed: ${TABLES_TO_MIGRATE.length - successCount}`);
  console.log(`Backup location: ${backupDir}`);
  
  if (successCount === TABLES_TO_MIGRATE.length) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Some tables failed to migrate. Check the logs above.');
  }
}

function showHelp() {
  console.log('🔄 Production to QA Database Migration Tool');
  console.log('==========================================\n');
  console.log('Usage:');
  console.log('  node scripts/migrate-prod-to-qa.js [command]\n');
  console.log('Commands:');
  console.log('  migrate  - Run full migration (default)');
  console.log('  help     - Show this help message\n');
  console.log('Environment Variables:');
  console.log('  PROD_DATABASE_URL - Your production database connection string');
  console.log('  QA_DATABASE_URL   - Your QA database connection string\n');
  console.log('Example:');
  console.log('  export PROD_DATABASE_URL="postgresql://user:pass@host:port/prod_db"');
  console.log('  export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
  console.log('  node scripts/migrate-prod-to-qa.js migrate\n');
  console.log('⚠️  WARNING: This will overwrite data in your QA database!');
  console.log('   Make sure to backup your QA database first if needed.');
}

const command = process.argv[2] || 'migrate';

switch (command) {
  case 'migrate':
    migrateData();
    break;
    
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
    
  default:
    console.log(`❌ Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}
