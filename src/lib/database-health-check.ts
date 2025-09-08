import { prisma } from './prisma';

/**
 * Database Health Check and Auto-Fix Utility
 * This function checks for common schema issues and attempts to fix them automatically
 */
export async function checkAndFixDatabaseSchema(): Promise<{
  success: boolean;
  issues: string[];
  fixes: string[];
}> {
  const issues: string[] = [];
  const fixes: string[] = [];

  try {
    // Check for missing columns in client_order_configs table
    const clientOrderConfigsColumns = [
      { name: 'pickup_location_overrides', type: 'JSONB', default: "'{}'" },
      { name: 'displayLogoOnWaybill', type: 'BOOLEAN', default: 'false' },
      { name: 'logoFileName', type: 'TEXT', default: 'NULL' },
      { name: 'logoFileSize', type: 'INTEGER', default: 'NULL' },
      { name: 'logoFileType', type: 'TEXT', default: 'NULL' },
      { name: 'logoEnabledCouriers', type: 'TEXT', default: 'NULL' },
      { name: 'enableAltMobileNumber', type: 'BOOLEAN', default: 'false' }
    ];

    for (const column of clientOrderConfigsColumns) {
      try {
        await prisma.$executeRaw`
          SELECT ${column.name} 
          FROM client_order_configs 
          LIMIT 1
        `;
      } catch (error) {
        if (error.message && error.message.includes(column.name)) {
          issues.push(`Missing ${column.name} column in client_order_configs table`);
          
          try {
            await prisma.$executeRaw`
              ALTER TABLE client_order_configs 
              ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.default}
            `;
            fixes.push(`Added ${column.name} column to client_order_configs table`);
          } catch (fixError) {
            issues.push(`Failed to add ${column.name} column: ${fixError.message}`);
          }
        }
      }
    }

    // Check for missing columns in rate_limits table
    const rateLimitsColumns = [
      { name: 'key', type: 'TEXT', default: "''" },
      { name: 'count', type: 'INTEGER', default: '0' },
      { name: 'windowStart', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'expiresAt', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'createdAt', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' },
      { name: 'updatedAt', type: 'TIMESTAMP', default: 'CURRENT_TIMESTAMP' }
    ];

    for (const column of rateLimitsColumns) {
      try {
        await prisma.$executeRaw`
          SELECT ${column.name} 
          FROM rate_limits 
          LIMIT 1
        `;
      } catch (error) {
        if (error.message && error.message.includes(column.name)) {
          issues.push(`Missing ${column.name} column in rate_limits table`);
          
          try {
            await prisma.$executeRaw`
              ALTER TABLE rate_limits 
              ADD COLUMN IF NOT EXISTS ${column.name} ${column.type} DEFAULT ${column.default}
            `;
            fixes.push(`Added ${column.name} column to rate_limits table`);
          } catch (fixError) {
            issues.push(`Failed to add ${column.name} column: ${fixError.message}`);
          }
        }
      }
    }

    // Check for missing tables
    const requiredTables = [
      'pickup_location_order_configs',
      'pickup_location_shopify_configs',
      'user_pickup_locations',
      'api_keys',
      'shopify_integrations',
      'shopify_orders'
    ];

    for (const tableName of requiredTables) {
      try {
        await prisma.$executeRaw`SELECT 1 FROM ${tableName} LIMIT 1`;
      } catch (error) {
        if (error.message && error.message.includes('does not exist')) {
          issues.push(`Missing table: ${tableName}`);
          // Note: Tables should be created via Prisma migrations, not raw SQL
        }
      }
    }

    // Check for missing Shopify fields in orders table
    const shopifyFields = [
      'shopify_customer_email',
      'shopify_fulfillment_id',
      'shopify_note',
      'shopify_order_id',
      'shopify_order_number',
      'shopify_tags',
      'shopify_update_error',
      'shopify_update_status',
      'shopify_update_timestamp',
      'tracking_url'
    ];

    for (const fieldName of shopifyFields) {
      try {
        await prisma.$executeRaw`SELECT ${fieldName} FROM orders LIMIT 1`;
      } catch (error) {
        if (error.message && error.message.includes(fieldName)) {
          issues.push(`Missing field ${fieldName} in orders table`);
          // Note: Fields should be added via Prisma migrations
        }
      }
    }

    return {
      success: issues.length === 0,
      issues,
      fixes
    };

  } catch (error) {
    return {
      success: false,
      issues: [`Database health check failed: ${error.message}`],
      fixes: []
    };
  }
}

/**
 * Wrapper function for database queries that handles schema issues gracefully
 */
export async function safeDatabaseQuery<T>(
  queryFn: () => Promise<T>,
  context: string = 'database query'
): Promise<T> {
  try {
    return await queryFn();
  } catch (error) {
    console.error(`❌ [${context}] Database query failed:`, error);
    
    // Check if the error is about missing columns and try to fix them
    if (error.message && error.message.includes('does not exist in the current database')) {
      console.log(`🔧 [${context}] Detected missing database column, attempting to fix schema...`);
      
      try {
        // Run the comprehensive schema fix
        const result = await checkAndFixDatabaseSchema();
        
        if (result.fixes.length > 0) {
          console.log(`✅ [${context}] Applied ${result.fixes.length} schema fixes:`, result.fixes);
          
          // Retry the original query
          return await queryFn();
        } else {
          console.log(`⚠️ [${context}] No fixes were applied, re-throwing original error`);
          throw error;
        }
      } catch (fixError) {
        console.error(`❌ [${context}] Failed to fix schema:`, fixError);
        throw error; // Re-throw original error
      }
    }
    
    throw error; // Re-throw if it's a different error
  }
}
