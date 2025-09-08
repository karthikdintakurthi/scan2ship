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
    // Check for missing pickup_location_overrides column
    try {
      await prisma.$executeRaw`
        SELECT pickup_location_overrides 
        FROM client_order_configs 
        LIMIT 1
      `;
    } catch (error) {
      if (error.message && error.message.includes('pickup_location_overrides')) {
        issues.push('Missing pickup_location_overrides column in client_order_configs table');
        
        try {
          await prisma.$executeRaw`
            ALTER TABLE client_order_configs 
            ADD COLUMN IF NOT EXISTS pickup_location_overrides JSONB DEFAULT '{}'
          `;
          fixes.push('Added pickup_location_overrides column to client_order_configs table');
        } catch (fixError) {
          issues.push(`Failed to add pickup_location_overrides column: ${fixError.message}`);
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
    
    // If the error is about missing column, try to fix it
    if (error.message && error.message.includes('pickup_location_overrides')) {
      console.log(`🔧 [${context}] Detected missing pickup_location_overrides column, attempting to add it...`);
      try {
        await prisma.$executeRaw`
          ALTER TABLE client_order_configs 
          ADD COLUMN IF NOT EXISTS pickup_location_overrides JSONB DEFAULT '{}'
        `;
        console.log(`✅ [${context}] Added missing pickup_location_overrides column`);
        
        // Retry the original query
        return await queryFn();
      } catch (fixError) {
        console.error(`❌ [${context}] Failed to add missing column:`, fixError);
        throw error; // Re-throw original error
      }
    }
    
    throw error; // Re-throw if it's a different error
  }
}
