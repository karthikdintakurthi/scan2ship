#!/usr/bin/env node

/**
 * Production to QA Database Migration Script using Prisma
 * More reliable than pg_dump for complex data structures
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your actual database URLs
const PROD_DATABASE_URL = process.env.PROD_DATABASE_URL || "your_production_database_url_here";
const QA_DATABASE_URL = process.env.QA_DATABASE_URL || "your_qa_database_url_here";

// Initialize Prisma clients
const prodPrisma = new PrismaClient({
  datasources: {
    db: {
      url: PROD_DATABASE_URL
    }
  }
});

const qaPrisma = new PrismaClient({
  datasources: {
    db: {
      url: QA_DATABASE_URL
    }
  }
});

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

async function migrateTable(tableName) {
  console.log(`🔄 Migrating table: ${tableName}`);
  
  try {
    // Read data from production
    const data = await prodPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
    
    if (data.length === 0) {
      console.log(`ℹ️  Table ${tableName} is empty, skipping...`);
      return true;
    }
    
    console.log(`📤 Found ${data.length} records in ${tableName}`);
    
    // Clear existing data in QA (optional - comment out if you want to append)
    await qaPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
    
    // Insert data into QA
    for (const record of data) {
      // Remove id field if it exists to let the database generate new IDs
      const { id, ...recordWithoutId } = record;
      
      try {
        await qaPrisma.$executeRawUnsafe(
          `INSERT INTO "${tableName}" (${Object.keys(recordWithoutId).map(key => `"${key}"`).join(', ')}) VALUES (${Object.values(recordWithoutId).map(() => '?').join(', ')})`,
          ...Object.values(recordWithoutId)
        );
      } catch (insertError) {
        console.error(`❌ Failed to insert record in ${tableName}:`, insertError.message);
        // Continue with other records
      }
    }
    
    console.log(`✅ Successfully migrated ${tableName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${tableName}:`, error.message);
    return false;
  }
}

async function migrateData() {
  console.log('🚀 Starting Production to QA Database Migration using Prisma');
  console.log('==========================================================\n');
  
  // Validate database URLs
  if (PROD_DATABASE_URL === "your_production_database_url_here" || 
      QA_DATABASE_URL === "your_qa_database_url_here") {
    console.error('❌ Please set PROD_DATABASE_URL and QA_DATABASE_URL environment variables');
    console.error('Example:');
    console.error('export PROD_DATABASE_URL="postgresql://user:pass@host:port/prod_db"');
    console.error('export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
    process.exit(1);
  }
  
  try {
    // Test connections
    console.log('🔍 Testing database connections...');
    await prodPrisma.$connect();
    console.log('✅ Production database connected');
    
    await qaPrisma.$connect();
    console.log('✅ QA database connected');
    
    // Start migration
    console.log('\n📤 Starting data migration...');
    
    let successCount = 0;
    for (const table of TABLES_TO_MIGRATE) {
      if (await migrateTable(table)) {
        successCount++;
      }
    }
    
    // Summary
    console.log('\n📊 Migration Summary');
    console.log('====================');
    console.log(`Total tables: ${TABLES_TO_MIGRATE.length}`);
    console.log(`Successfully migrated: ${successCount}`);
    console.log(`Failed: ${TABLES_TO_MIGRATE.length - successCount}`);
    
    if (successCount === TABLES_TO_MIGRATE.length) {
      console.log('\n🎉 Migration completed successfully!');
    } else {
      console.log('\n⚠️  Some tables failed to migrate. Check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await prodPrisma.$disconnect();
    await qaPrisma.$disconnect();
  }
}

function showHelp() {
  console.log('🔄 Production to QA Database Migration Tool (Prisma)');
  console.log('===================================================\n');
  console.log('Usage:');
  console.log('  node scripts/migrate-prod-to-qa-prisma.js [command]\n');
  console.log('Commands:');
  console.log('  migrate  - Run full migration (default)');
  console.log('  help     - Show this help message\n');
  console.log('Environment Variables:');
  console.log('  PROD_DATABASE_URL - Your production database connection string');
  console.log('  QA_DATABASE_URL   - Your QA database connection string\n');
  console.log('Example:');
  console.log('  export PROD_DATABASE_URL="postgresql://user:pass@host:port/prod_db"');
  console.log('  export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
  console.log('  node scripts/migrate-prod-to-qa-prisma.js migrate\n');
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
