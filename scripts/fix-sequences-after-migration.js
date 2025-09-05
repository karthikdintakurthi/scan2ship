#!/usr/bin/env node

/**
 * Fix Sequences After Migration Script
 * Resets auto-increment sequences to avoid ID conflicts after data migration
 */

const { PrismaClient } = require('@prisma/client');

// Configuration - Update this with your QA database URL
const QA_DATABASE_URL = process.env.QA_DATABASE_URL || "your_qa_database_url_here";

// Initialize Prisma client
const qaPrisma = new PrismaClient({
  datasources: {
    db: {
      url: QA_DATABASE_URL
    }
  }
});

// Tables with SERIAL columns that need sequence fixing
const TABLES_WITH_SERIALS = [
  {
    tableName: 'orders',
    idColumn: 'id',
    sequenceName: 'orders_id_seq'
  }
];

async function fixSequence(tableName, idColumn, sequenceName) {
  try {
    console.log(`🔧 Fixing sequence for ${tableName}.${idColumn}...`);
    
    // Get the maximum ID value from the table
    const maxIdResult = await qaPrisma.$queryRawUnsafe(`SELECT MAX("${idColumn}") as max_id FROM "${tableName}"`);
    const maxId = maxIdResult[0]?.max_id;
    
    if (maxId === null || maxId === undefined) {
      console.log(`ℹ️  Table ${tableName} is empty, setting sequence to 0`);
      await qaPrisma.$executeRawUnsafe(`SELECT setval('${sequenceName}', 0, true)`);
      return true;
    }
    
    console.log(`📊 Max ID in ${tableName}: ${maxId}`);
    
    // Set the sequence to the maximum ID value
    // The 'true' parameter means the next value will be maxId + 1
    await qaPrisma.$executeRawUnsafe(`SELECT setval('${sequenceName}', ${maxId}, true)`);
    
    // Verify the sequence is set correctly
    const nextValResult = await qaPrisma.$executeRawUnsafe(`SELECT nextval('${sequenceName}')`);
    console.log(`✅ Sequence ${sequenceName} set to ${maxId}, next value will be ${maxId + 1}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to fix sequence for ${tableName}:`, error.message);
    return false;
  }
}

async function fixAllSequences() {
  console.log('🔧 Fixing Sequences After Migration');
  console.log('====================================\n');
  
  // Validate database URL
  if (QA_DATABASE_URL === "your_qa_database_url_here") {
    console.error('❌ Please set QA_DATABASE_URL environment variable');
    console.error('Example:');
    console.error('export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
    process.exit(1);
  }
  
  try {
    // Test connection
    console.log('🔍 Testing database connection...');
    await qaPrisma.$connect();
    console.log('✅ QA database connected');
    
    // Fix sequences for all tables
    console.log('\n🔧 Starting sequence fixes...');
    
    let successCount = 0;
    for (const table of TABLES_WITH_SERIALS) {
      if (await fixSequence(table.tableName, table.idColumn, table.sequenceName)) {
        successCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Sequence Fix Summary');
    console.log('========================');
    console.log(`Total tables: ${TABLES_WITH_SERIALS.length}`);
    console.log(`Successfully fixed: ${successCount}`);
    console.log(`Failed: ${TABLES_WITH_SERIALS.length - successCount}`);
    
    if (successCount === TABLES_WITH_SERIALS.length) {
      console.log('\n🎉 All sequences fixed successfully!');
      console.log('💡 You can now create new orders without ID conflicts.');
    } else {
      console.log('\n⚠️  Some sequences failed to fix. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Sequence fixing failed:', error.message);
    process.exit(1);
  } finally {
    await qaPrisma.$disconnect();
  }
}

function showHelp() {
  console.log('🔧 Fix Sequences After Migration Tool');
  console.log('=====================================\n');
  console.log('Usage:');
  console.log('  node scripts/fix-sequences-after-migration.js [command]\n');
  console.log('Commands:');
  console.log('  fix      - Fix all sequences (default)');
  console.log('  help     - Show this help message\n');
  console.log('Environment Variables:');
  console.log('  QA_DATABASE_URL - Your QA database connection string\n');
  console.log('Example:');
  console.log('  export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
  console.log('  node scripts/fix-sequences-after-migration.js fix\n');
  console.log('💡 This script fixes auto-increment sequence conflicts that occur');
  console.log('   after migrating data from production to QA environments.');
}

const command = process.argv[2] || 'fix';

switch (command) {
  case 'fix':
    fixAllSequences();
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
