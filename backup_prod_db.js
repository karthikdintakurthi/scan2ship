#!/usr/bin/env node

/**
 * Production Database Backup Script
 * Creates comprehensive backup of PostgreSQL database including schema and data
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
  // 1. Schema-only backup (structure only)
  console.log('\n📋 Creating schema backup...');
  const schemaFile = path.join(BACKUP_DIR, `prod-schema-${timestamp}.sql`);
  const schemaCommand = `pg_dump "${PROD_DB_URL}" --schema-only --no-owner --no-privileges --clean --if-exists --format=plain --no-sync > "${schemaFile}"`;
  
  console.log('🔧 Schema Command:', schemaCommand);
  execSync(schemaCommand, { stdio: 'inherit' });
  console.log('✅ Schema backup completed:', schemaFile);

  // 2. Data-only backup (data only, no schema)
  console.log('\n📊 Creating data backup...');
  const dataFile = path.join(BACKUP_DIR, `prod-data-${timestamp}.sql`);
  const dataCommand = `pg_dump "${PROD_DB_URL}" --data-only --no-owner --no-privileges --format=plain --no-sync > "${dataFile}"`;
  
  console.log('🔧 Data Command:', dataCommand);
  execSync(dataCommand, { stdio: 'inherit' });
  console.log('✅ Data backup completed:', dataFile);

  // 3. Complete backup (schema + data)
  console.log('\n🗄️ Creating complete backup...');
  const completeFile = path.join(BACKUP_DIR, `prod-complete-${timestamp}.sql`);
  const completeCommand = `pg_dump "${PROD_DB_URL}" --no-owner --no-privileges --clean --if-exists --format=plain --no-sync > "${completeFile}"`;
  
  console.log('🔧 Complete Command:', completeCommand);
  execSync(completeCommand, { stdio: 'inherit' });
  console.log('✅ Complete backup completed:', completeFile);

  // 4. Compressed backup
  console.log('\n🗜️ Creating compressed backup...');
  const compressedFile = path.join(BACKUP_DIR, `prod-compressed-${timestamp}.sql.gz`);
  const compressedCommand = `pg_dump "${PROD_DB_URL}" --no-owner --no-privileges --clean --if-exists --format=custom --no-sync | gzip > "${compressedFile}"`;
  
  console.log('🔧 Compressed Command:', compressedCommand);
  execSync(compressedCommand, { stdio: 'inherit' });
  console.log('✅ Compressed backup completed:', compressedFile);

  // 5. JSON backup for easy inspection
  console.log('\n📄 Creating JSON backup...');
  const jsonFile = path.join(BACKUP_DIR, `prod-json-${timestamp}.json`);
  const jsonCommand = `pg_dump "${PROD_DB_URL}" --no-owner --no-privileges --format=json --no-sync > "${jsonFile}"`;
  
  console.log('🔧 JSON Command:', jsonCommand);
  execSync(jsonCommand, { stdio: 'inherit' });
  console.log('✅ JSON backup completed:', jsonFile);

  // 6. Get file sizes
  console.log('\n📊 Backup File Sizes:');
  const files = [schemaFile, dataFile, completeFile, compressedFile, jsonFile];
  files.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📁 ${path.basename(file)}: ${sizeInMB} MB`);
    }
  });

  // 7. Create backup summary
  const summaryFile = path.join(BACKUP_DIR, `BACKUP_SUMMARY_${timestamp}.txt`);
  const summary = `
PRODUCTION DATABASE BACKUP SUMMARY
==================================
Timestamp: ${new Date().toISOString()}
Database: ${PROD_DB_URL.split('@')[1].split('/')[0]}
Backup Directory: ${BACKUP_DIR}

Files Created:
- Schema: ${path.basename(schemaFile)}
- Data: ${path.basename(dataFile)}
- Complete: ${path.basename(completeFile)}
- Compressed: ${path.basename(compressedFile)}
- JSON: ${path.basename(jsonFile)}

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
- Schema: pg_dump --schema-only --no-owner --no-privileges --clean --if-exists
- Data: pg_dump --data-only --no-owner --no-privileges
- Complete: pg_dump --no-owner --no-privileges --clean --if-exists
- Compressed: pg_dump --no-owner --no-privileges --clean --if-exists --format=custom | gzip
- JSON: pg_dump --no-owner --no-privileges --format=json

Restore Commands:
- Schema: psql "target_db_url" < ${path.basename(schemaFile)}
- Data: psql "target_db_url" < ${path.basename(dataFile)}
- Complete: psql "target_db_url" < ${path.basename(completeFile)}
- Compressed: gunzip -c ${path.basename(compressedFile)} | psql "target_db_url"
- JSON: psql "target_db_url" < ${path.basename(jsonFile)}

⚠️  IMPORTANT NOTES:
- All backups exclude ownership and privileges for portability
- Use --clean --if-exists flags to avoid conflicts during restore
- Test restore on a development database before production use
- Keep backups secure as they contain production data
`;

  fs.writeFileSync(summaryFile, summary);
  console.log('📋 Backup summary created:', summaryFile);

  console.log('\n🎉 Production Database Backup Completed Successfully!');
  console.log('📁 All backup files saved to:', BACKUP_DIR);
  console.log('📋 Summary file:', summaryFile);

} catch (error) {
  console.error('❌ Backup failed:', error.message);
  console.error('🔍 Error details:', error);
  process.exit(1);
}
