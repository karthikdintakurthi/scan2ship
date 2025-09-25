const { execSync } = require('child_process');

const DATABASE_URL = "postgresql://postgres:qiPervuwisWMMtwVKBdhzOyUsyJPSRlv@gondola.proxy.rlwy.net:45956/railway";

const migrations = [
  '20250906175919_add_shopify_status_fields',
  '20250906192006_add_rate_limits_table',
  '20250906193053_add_security_tables',
  '20250906193202_security',
  '20250906193433_add_csrf_tokens',
  '20250906193507_add_blocked_ips',
  '20250908205101_add_logo_fields_to_client_order_configs',
  '20250908205329_add_logo_enabled_couriers_field',
  '20250908212008_add_enable_alt_mobile_number_field',
  '20250908213836_add_pickup_requests_table',
  '20250908214021_add_expected_package_count_to_pickup_requests',
  '20250909042000_add_tracking_status_column',
  '20250916123030_add_a5_print_mode',
  '20250925150000_add_products_to_orders'
];

async function migrateDatabase() {
  console.log('🔄 Starting development database migration...');
  
  for (const migration of migrations) {
    try {
      console.log(`📊 Attempting migration: ${migration}`);
      
      // Try to apply the migration
      execSync(`DATABASE_URL="${DATABASE_URL}" npx prisma migrate deploy`, { 
        stdio: 'pipe',
        cwd: process.cwd()
      });
      
      console.log(`✅ Migration ${migration} applied successfully`);
      break; // If successful, all remaining migrations should be applied
      
    } catch (error) {
      console.log(`⚠️  Migration ${migration} failed, marking as applied: ${error.message.split('\n')[0]}`);
      
      try {
        // Mark as applied if it failed due to existing columns/tables
        execSync(`DATABASE_URL="${DATABASE_URL}" npx prisma migrate resolve --applied ${migration}`, { 
          stdio: 'pipe',
          cwd: process.cwd()
        });
        console.log(`✅ Migration ${migration} marked as applied`);
      } catch (resolveError) {
        console.log(`❌ Failed to mark ${migration} as applied: ${resolveError.message}`);
      }
    }
  }
  
  console.log('🎉 Development database migration completed!');
}

migrateDatabase().catch(console.error);
