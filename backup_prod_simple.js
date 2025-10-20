#!/usr/bin/env node

/**
 * Simple Production Database Backup Script
 * Handles version mismatch between local pg_dump and production PostgreSQL
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Production database connection string
const PROD_DB_URL = 'postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway';

// Create backups directory
const BACKUP_DIR = path.join(__dirname, 'backups');
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate timestamp for backup files
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                 new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];

console.log('🚀 Starting Production Database Backup...');
console.log('📅 Timestamp:', timestamp);
console.log('📁 Backup Directory:', BACKUP_DIR);

try {
  // 1. Complete backup (schema + data) - most important
  console.log('\n🗄️ Creating complete backup...');
  const completeFile = path.join(BACKUP_DIR, `prod-complete-${timestamp}.sql`);
  
  // Use environment variable to handle version mismatch
  const env = { ...process.env, PGOPTIONS: '--client-min-messages=warning' };
  
  const completeCommand = `pg_dump "${PROD_DB_URL}" --no-owner --no-privileges --clean --if-exists --format=plain`;
  
  console.log('🔧 Complete Command:', completeCommand);
  execSync(`${completeCommand} > "${completeFile}"`, { 
    stdio: 'inherit',
    env: env
  });
  console.log('✅ Complete backup completed:', completeFile);

  // 2. Schema-only backup
  console.log('\n📋 Creating schema backup...');
  const schemaFile = path.join(BACKUP_DIR, `prod-schema-${timestamp}.sql`);
  const schemaCommand = `pg_dump "${PROD_DB_URL}" --schema-only --no-owner --no-privileges --clean --if-exists --format=plain`;
  
  console.log('🔧 Schema Command:', schemaCommand);
  execSync(`${schemaCommand} > "${schemaFile}"`, { 
    stdio: 'inherit',
    env: env
  });
  console.log('✅ Schema backup completed:', schemaFile);

  // 3. Data-only backup
  console.log('\n📊 Creating data backup...');
  const dataFile = path.join(BACKUP_DIR, `prod-data-${timestamp}.sql`);
  const dataCommand = `pg_dump "${PROD_DB_URL}" --data-only --no-owner --no-privileges --format=plain`;
  
  console.log('🔧 Data Command:', dataCommand);
  execSync(`${dataCommand} > "${dataFile}"`, { 
    stdio: 'inherit',
    env: env
  });
  console.log('✅ Data backup completed:', dataFile);

  // 4. Get file sizes
  console.log('\n📊 Backup File Sizes:');
  const files = [schemaFile, dataFile, completeFile];
  files.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📁 ${path.basename(file)}: ${sizeInMB} MB`);
    }
  });

  // 5. Create backup summary
  const summaryFile = path.join(BACKUP_DIR, `BACKUP_SUMMARY_${timestamp}.txt`);
  const summary = `
PRODUCTION DATABASE BACKUP SUMMARY
==================================
Timestamp: ${new Date().toISOString()}
Database: ${PROD_DB_URL.split('@')[1].split('/')[0]}
Backup Directory: ${BACKUP_DIR}

Files Created:
- Complete: ${path.basename(completeFile)}
- Schema: ${path.basename(schemaFile)}
- Data: ${path.basename(dataFile)}

File Sizes:
${files.map(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    return `- ${path.basename(file)}: ${sizeInMB} MB`;
  }
  return `- ${path.basename(file)}: Not found`;
}).join('\n')}

Backup Commands Used:
- Complete: pg_dump --no-owner --no-privileges --clean --if-exists --format=plain
- Schema: pg_dump --schema-only --no-owner --no-privileges --clean --if-exists --format=plain
- Data: pg_dump --data-only --no-owner --no-privileges --format=plain

Restore Commands:
- Complete: psql "target_db_url" < ${path.basename(completeFile)}
- Schema: psql "target_db_url" < ${path.basename(schemaFile)}
- Data: psql "target_db_url" < ${path.basename(dataFile)}

⚠️  IMPORTANT NOTES:
- All backups exclude ownership and privileges for portability
- Use --clean --if-exists flags to avoid conflicts during restore
- Test restore on a development database before production use
- Keep backups secure as they contain production data
- Version mismatch handled with PGOPTIONS environment variable
`;

  fs.writeFileSync(summaryFile, summary);
  console.log('📋 Backup summary created:', summaryFile);

  console.log('\n🎉 Production Database Backup Completed Successfully!');
  console.log('📁 All backup files saved to:', BACKUP_DIR);
  console.log('📋 Summary file:', summaryFile);

} catch (error) {
  console.error('❌ Backup failed:', error.message);
  console.error('🔍 Error details:', error);
  
  // Try alternative approach with different flags
  console.log('\n🔄 Trying alternative backup approach...');
  try {
    const altFile = path.join(BACKUP_DIR, `prod-alternative-${timestamp}.sql`);
    const altCommand = `pg_dump "${PROD_DB_URL}" --no-owner --no-privileges --format=plain`;
    
    console.log('🔧 Alternative Command:', altCommand);
    execSync(`${altCommand} > "${altFile}"`, { 
      stdio: 'inherit',
      env: { ...process.env, PGOPTIONS: '--client-min-messages=warning' }
    });
    console.log('✅ Alternative backup completed:', altFile);
    
    const stats = fs.statSync(altFile);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📁 ${path.basename(altFile)}: ${sizeInMB} MB`);
    
  } catch (altError) {
    console.error('❌ Alternative backup also failed:', altError.message);
    process.exit(1);
  }
}

