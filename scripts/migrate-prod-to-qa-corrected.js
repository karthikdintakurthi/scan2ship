#!/usr/bin/env node

/**
 * Production to QA Database Migration Script (Corrected)
 * Preserves ID fields since they are required primary keys
 */

const { PrismaClient } = require('@prisma/client');

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

async function getTableData(tableName) {
  try {
    console.log(`📤 Reading data from ${tableName}...`);
    const data = await prodPrisma.$queryRawUnsafe(`SELECT * FROM "${tableName}"`);
    console.log(`✅ Found ${data.length} records in ${tableName}`);
    return data;
  } catch (error) {
    console.error(`❌ Failed to read ${tableName}:`, error.message);
    return [];
  }
}

async function clearTable(tableName) {
  try {
    console.log(`🧹 Clearing existing data in ${tableName}...`);
    await qaPrisma.$executeRawUnsafe(`TRUNCATE TABLE "${tableName}" CASCADE`);
    console.log(`✅ Cleared ${tableName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to clear ${tableName}:`, error.message);
    return false;
  }
}

async function insertRecords(tableName, records) {
  if (records.length === 0) {
    console.log(`ℹ️  No records to insert for ${tableName}`);
    return true;
  }

  try {
    console.log(`📥 Inserting ${records.length} records into ${tableName}...`);
    
    // Get column names from first record (including id)
    const firstRecord = records[0];
    const columnNames = Object.keys(firstRecord);
    
    // Build the INSERT statement with all columns including ID
    const placeholders = columnNames.map((_, index) => `$${index + 1}`).join(', ');
    const insertQuery = `INSERT INTO "${tableName}" (${columnNames.map(name => `"${name}"`).join(', ')}) VALUES (${placeholders})`;
    
    // Insert records in batches to avoid memory issues
    const batchSize = 100;
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      
      for (const record of batch) {
        const valuesArray = Object.values(record);
        
        try {
          await qaPrisma.$executeRawUnsafe(insertQuery, ...valuesArray);
        } catch (insertError) {
          console.error(`⚠️  Failed to insert record in ${tableName}:`, insertError.message);
          // Continue with other records
        }
      }
      
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)}`);
    }
    
    console.log(`✅ Successfully migrated ${tableName}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${tableName}:`, error.message);
    return false;
  }
}

async function migrateTable(tableName) {
  console.log(`\n🔄 Migrating table: ${tableName}`);
  console.log('─'.repeat(50));
  
  try {
    // Step 1: Get data from production
    const data = await getTableData(tableName);
    if (data.length === 0) {
      console.log(`ℹ️  Table ${tableName} is empty, skipping...`);
      return true;
    }
    
    // Step 2: Clear existing data in QA
    const cleared = await clearTable(tableName);
    if (!cleared) {
      console.log(`⚠️  Could not clear ${tableName}, attempting to insert anyway...`);
    }
    
    // Step 3: Insert data into QA
    const inserted = await insertRecords(tableName, data);
    
    return inserted;
    
  } catch (error) {
    console.error(`❌ Failed to migrate ${tableName}:`, error.message);
    return false;
  }
}

async function migrateData() {
  console.log('🚀 Starting Production to QA Database Migration (Corrected)');
  console.log('================================================================\n');
  
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
  console.log('🔄 Production to QA Database Migration Tool (Corrected)');
  console.log('========================================================\n');
  console.log('Usage:');
  console.log('  node scripts/migrate-prod-to-qa-corrected.js [command]\n');
  console.log('Commands:');
  console.log('  migrate  - Run full migration (default)');
  console.log('  help     - Show this help message\n');
  console.log('Environment Variables:');
  console.log('  PROD_DATABASE_URL - Your production database connection string');
  console.log('  QA_DATABASE_URL   - Your QA database connection string\n');
  console.log('Example:');
  console.log('  export PROD_DATABASE_URL="postgresql://user:pass@host:port/prod_db"');
  console.log('  export QA_DATABASE_URL="postgresql://user:pass@host:port/qa_db"');
  console.log('  node scripts/migrate-prod-to-qa-corrected.js migrate\n');
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
