const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Production database URL
const DATABASE_URL = "postgresql://postgres:xhbDPEyHMSyXabCJnmuYiXDcZdFJJUAg@nozomi.proxy.rlwy.net:34560/railway";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

async function backupDatabase() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, 'backups');
  
  // Ensure backup directory exists
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  try {
    console.log('🔄 Starting database backup...');
    
    // Get all tables and their data
    const tables = [
      'Order', 'categories', 'client_config', 'client_order_configs', 
      'client_settings', 'clients', 'countries', 'currencies', 
      'inventory_history', 'media', 'performance_metrics', 
      'product_categories', 'products', 'system_config', 'users'
    ];

    const backup = {
      timestamp: new Date().toISOString(),
      database: 'scan2ship_production',
      tables: {}
    };

    for (const table of tables) {
      try {
        console.log(`📊 Backing up table: ${table}`);
        const data = await prisma[table.toLowerCase()].findMany();
        backup.tables[table] = data;
        console.log(`✅ ${table}: ${data.length} records`);
      } catch (error) {
        console.log(`❌ Error backing up ${table}:`, error.message);
        backup.tables[table] = { error: error.message };
      }
    }

    // Save backup to file
    const backupFile = path.join(backupDir, `scan2ship_prod_backup_${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
    
    console.log(`✅ Backup completed: ${backupFile}`);
    console.log(`📊 Total tables backed up: ${Object.keys(backup.tables).length}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

backupDatabase();
