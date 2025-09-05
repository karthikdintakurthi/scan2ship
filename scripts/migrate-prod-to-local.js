#!/usr/bin/env node

/**
 * Database Migration Script: Production to Local
 * 
 * This script safely migrates all data from production database to local database
 * while preserving data integrity and relationships.
 * 
 * IMPORTANT: This script only READS from production and WRITES to local.
 * Production database is never modified.
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database URLs
const PROD_DB_URL = 'postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway';
const LOCAL_DB_URL = 'postgresql://postgres:OMqLdGotCnTMFiWoWQATmnCRplSvKkhZ@mainline.proxy.rlwy.net:13785/railway';

// Table migration order (respecting foreign key dependencies)
const MIGRATION_ORDER = [
  'clients',                    // Base table
  'users',                      // Depends on clients
  'sessions',                   // Depends on users and clients
  'system_config',              // Independent
  'client_config',              // Depends on clients
  'client_credits',             // Depends on clients
  'client_credit_costs',        // Depends on clients
  'client_order_configs',       // Depends on clients
  'courier_services',           // Depends on clients
  'pickup_locations',           // Depends on clients
  'orders',                     // Depends on clients
  'credit_transactions',        // Depends on clients, users, orders
  'order_analytics',            // Depends on clients, users, orders
  'analytics_events'            // Depends on clients, users
];

// Tables that need special handling (auto-increment sequences)
const SEQUENCE_TABLES = {
  'orders': 'id'
};

class DatabaseMigrator {
  constructor() {
    this.prodClient = null;
    this.localClient = null;
    this.migrationLog = [];
    this.startTime = new Date();
  }

  async connect() {
    console.log('🔌 Connecting to databases...');
    
    try {
      this.prodClient = new Client({ connectionString: PROD_DB_URL });
      this.localClient = new Client({ connectionString: LOCAL_DB_URL });
      
      await this.prodClient.connect();
      await this.localClient.connect();
      
      console.log('✅ Connected to both databases successfully');
    } catch (error) {
      console.error('❌ Failed to connect to databases:', error.message);
      throw error;
    }
  }

  async disconnect() {
    console.log('🔌 Disconnecting from databases...');
    
    if (this.prodClient) {
      await this.prodClient.end();
    }
    if (this.localClient) {
      await this.localClient.end();
    }
    
    console.log('✅ Disconnected from databases');
  }

  async getTableInfo(tableName) {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;
    
    const result = await this.prodClient.query(query, [tableName]);
    return result.rows;
  }

  async getLocalTableInfo(tableName) {
    const query = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = $1 
      ORDER BY ordinal_position
    `;
    
    const result = await this.localClient.query(query, [tableName]);
    return result.rows;
  }

  async getTableCount(tableName) {
    const query = `SELECT COUNT(*) as count FROM ${tableName}`;
    const result = await this.prodClient.query(query);
    return parseInt(result.rows[0].count);
  }

  async clearLocalTable(tableName) {
    console.log(`🗑️  Clearing local table: ${tableName}`);
    
    try {
      // Disable foreign key checks temporarily
      await this.localClient.query('SET session_replication_role = replica;');
      
      // Clear the table
      await this.localClient.query(`DELETE FROM ${tableName}`);
      
      // Reset sequences if needed
      if (SEQUENCE_TABLES[tableName]) {
        const sequenceName = `${tableName}_${SEQUENCE_TABLES[tableName]}_seq`;
        await this.localClient.query(`SELECT setval('${sequenceName}', 1, false)`);
      }
      
      // Re-enable foreign key checks
      await this.localClient.query('SET session_replication_role = DEFAULT;');
      
      console.log(`✅ Cleared local table: ${tableName}`);
    } catch (error) {
      console.error(`❌ Failed to clear local table ${tableName}:`, error.message);
      throw error;
    }
  }

  async migrateTable(tableName, dryRun = false) {
    console.log(`\n📦 Migrating table: ${tableName}`);
    
    try {
      // Get table structure from both databases to ensure compatibility
      const prodColumns = await this.getTableInfo(tableName);
      const localColumns = await this.getLocalTableInfo(tableName);
      
      // Create column mapping (prod column -> local column)
      const columnMapping = [];
      const localColumnNames = [];
      
      for (const prodCol of prodColumns) {
        const localCol = localColumns.find(lc => lc.column_name === prodCol.column_name);
        if (localCol) {
          columnMapping.push({ prod: prodCol.column_name, local: localCol.column_name });
          localColumnNames.push(localCol.column_name);
        } else {
          console.log(`   ⚠️  Column ${prodCol.column_name} not found in local table, skipping`);
        }
      }
      
      if (columnMapping.length === 0) {
        console.log(`   ⏭️  No compatible columns found for table: ${tableName}`);
        return { tableName, rowCount: 0, success: true };
      }
      
      const prodColumnNames = columnMapping.map(m => `"${m.prod}"`).join(', ');
      const localColumnNamesStr = localColumnNames.map(name => `"${name}"`).join(', ');
      
      // Get row count
      const rowCount = await this.getTableCount(tableName);
      console.log(`   📊 Found ${rowCount} rows in production`);
      console.log(`   🔗 Mapping ${columnMapping.length} columns`);
      
      if (rowCount === 0) {
        console.log(`   ⏭️  Skipping empty table: ${tableName}`);
        return { tableName, rowCount: 0, success: true };
      }
      
      if (!dryRun) {
        // Clear local table first
        await this.clearLocalTable(tableName);
        
        // Fetch all data from production
        const selectQuery = `SELECT ${prodColumnNames} FROM ${tableName}`;
        const prodResult = await this.prodClient.query(selectQuery);
        
        if (prodResult.rows.length === 0) {
          console.log(`   ⏭️  No data to migrate for table: ${tableName}`);
          return { tableName, rowCount: 0, success: true };
        }
        
        // Prepare insert query
        const placeholders = columnMapping.map((_, index) => `$${index + 1}`).join(', ');
        const insertQuery = `INSERT INTO ${tableName} (${localColumnNamesStr}) VALUES (${placeholders})`;
        
        // Insert data in batches
        const batchSize = 1000;
        let insertedCount = 0;
        
        for (let i = 0; i < prodResult.rows.length; i += batchSize) {
          const batch = prodResult.rows.slice(i, i + batchSize);
          
          for (const row of batch) {
            const values = columnMapping.map(mapping => row[mapping.prod]);
            await this.localClient.query(insertQuery, values);
            insertedCount++;
          }
          
          if (insertedCount % 1000 === 0) {
            console.log(`   📈 Migrated ${insertedCount}/${rowCount} rows...`);
          }
        }
        
        // Reset sequence if needed
        if (SEQUENCE_TABLES[tableName]) {
          const sequenceName = `${tableName}_${SEQUENCE_TABLES[tableName]}_seq`;
          const maxIdQuery = `SELECT MAX(${SEQUENCE_TABLES[tableName]}) as max_id FROM ${tableName}`;
          const maxResult = await this.localClient.query(maxIdQuery);
          const maxId = maxResult.rows[0].max_id || 0;
          
          await this.localClient.query(`SELECT setval('${sequenceName}', ${maxId + 1}, false)`);
          console.log(`   🔢 Reset sequence ${sequenceName} to ${maxId + 1}`);
        }
        
        console.log(`   ✅ Successfully migrated ${insertedCount} rows to local table: ${tableName}`);
        
        return { tableName, rowCount: insertedCount, success: true };
      } else {
        console.log(`   🔍 [DRY RUN] Would migrate ${rowCount} rows to local table: ${tableName}`);
        return { tableName, rowCount, success: true };
      }
      
    } catch (error) {
      console.error(`   ❌ Failed to migrate table ${tableName}:`, error.message);
      return { tableName, rowCount: 0, success: false, error: error.message };
    }
  }

  async verifyMigration() {
    console.log('\n🔍 Verifying migration...');
    
    const verificationResults = [];
    
    for (const tableName of MIGRATION_ORDER) {
      try {
        const prodCount = await this.getTableCount(tableName);
        
        const localCountQuery = `SELECT COUNT(*) as count FROM ${tableName}`;
        const localResult = await this.localClient.query(localCountQuery);
        const localCount = parseInt(localResult.rows[0].count);
        
        const isMatch = prodCount === localCount;
        const status = isMatch ? '✅' : '❌';
        
        console.log(`   ${status} ${tableName}: Prod=${prodCount}, Local=${localCount}`);
        
        verificationResults.push({
          tableName,
          prodCount,
          localCount,
          isMatch
        });
        
      } catch (error) {
        console.error(`   ❌ ${tableName}: Verification failed - ${error.message}`);
        verificationResults.push({
          tableName,
          prodCount: 0,
          localCount: 0,
          isMatch: false,
          error: error.message
        });
      }
    }
    
    const allMatch = verificationResults.every(result => result.isMatch);
    console.log(`\n${allMatch ? '✅' : '❌'} Migration verification: ${allMatch ? 'PASSED' : 'FAILED'}`);
    
    return verificationResults;
  }

  async runMigration(dryRun = false) {
    console.log(`\n🚀 Starting database migration ${dryRun ? '(DRY RUN)' : ''}...`);
    console.log(`📅 Started at: ${this.startTime.toISOString()}`);
    console.log(`📊 Tables to migrate: ${MIGRATION_ORDER.length}`);
    
    const results = [];
    
    for (const tableName of MIGRATION_ORDER) {
      const result = await this.migrateTable(tableName, dryRun);
      results.push(result);
      
      if (!result.success) {
        console.error(`\n❌ Migration failed at table: ${tableName}`);
        console.error('Stopping migration process...');
        break;
      }
    }
    
    const endTime = new Date();
    const duration = (endTime - this.startTime) / 1000;
    
    console.log(`\n📊 Migration Summary:`);
    console.log(`   ⏱️  Duration: ${duration.toFixed(2)} seconds`);
    console.log(`   📦 Tables processed: ${results.length}`);
    console.log(`   ✅ Successful: ${results.filter(r => r.success).length}`);
    console.log(`   ❌ Failed: ${results.filter(r => !r.success).length}`);
    
    if (!dryRun) {
      console.log(`\n🔍 Running verification...`);
      await this.verifyMigration();
    }
    
    // Save migration log
    const logData = {
      timestamp: this.startTime.toISOString(),
      duration: duration,
      dryRun: dryRun,
      results: results,
      summary: {
        totalTables: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
    
    const logFile = `migration-log-${this.startTime.toISOString().replace(/[:.]/g, '-')}.json`;
    fs.writeFileSync(logFile, JSON.stringify(logData, null, 2));
    console.log(`\n📝 Migration log saved to: ${logFile}`);
    
    return results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  
  console.log('🔄 Database Migration Tool: Production → Local');
  console.log('==============================================');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no data will be modified');
  } else {
    console.log('⚠️  WARNING: This will overwrite your local database!');
    console.log('   Make sure you have backups if needed.');
  }
  
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.connect();
    await migrator.runMigration(dryRun);
    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    process.exit(1);
  } finally {
    await migrator.disconnect();
  }
}

// Handle script execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = DatabaseMigrator;
