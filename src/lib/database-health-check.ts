import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Database health check utilities with automatic column fixing
 */
export class DatabaseHealthCheck {
  private static instance: DatabaseHealthCheck;
  private isInitialized = false;

  static getInstance(): DatabaseHealthCheck {
    if (!DatabaseHealthCheck.instance) {
      DatabaseHealthCheck.instance = new DatabaseHealthCheck();
    }
    return DatabaseHealthCheck.instance;
  }

  /**
   * Initialize database health check and fix any missing columns
   */
  async initialize(): Promise<{ success: boolean; message: string; fixedColumns?: string[] }> {
    if (this.isInitialized) {
      return { success: true, message: 'Database health check already initialized' };
    }

    try {
      console.log('🔍 [DB_HEALTH] Starting database health check...');
      
      const fixedColumns = await this.fixMissingColumns();
      
      this.isInitialized = true;
      
      if (fixedColumns.length > 0) {
        console.log(`✅ [DB_HEALTH] Database health check completed. Fixed ${fixedColumns.length} missing columns:`, fixedColumns);
        return { 
          success: true, 
          message: `Fixed ${fixedColumns.length} missing columns`, 
          fixedColumns 
        };
      } else {
        console.log('✅ [DB_HEALTH] Database health check completed. No missing columns found.');
        return { success: true, message: 'No missing columns found' };
      }
    } catch (error) {
      console.error('❌ [DB_HEALTH] Database health check failed:', error);
      return { 
        success: false, 
        message: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Fix missing columns in the database
   */
  private async fixMissingColumns(): Promise<string[]> {
    const fixedColumns: string[] = [];
    
    try {
      // Check and fix client_order_configs table
      const clientOrderConfigsColumns = await this.checkAndFixClientOrderConfigs();
      fixedColumns.push(...clientOrderConfigsColumns);

      // Check and fix rate_limits table
      const rateLimitsColumns = await this.checkAndFixRateLimits();
      fixedColumns.push(...rateLimitsColumns);

      // Check and fix orders table
      const ordersColumns = await this.checkAndFixOrders();
      fixedColumns.push(...ordersColumns);

    } catch (error) {
      console.error('❌ [DB_HEALTH] Error fixing missing columns:', error);
    }

    return fixedColumns;
  }

  /**
   * Check and fix client_order_configs table
   */
  private async checkAndFixClientOrderConfigs(): Promise<string[]> {
    const fixedColumns: string[] = [];
    
    try {
      // Check if pickup_location_overrides column exists
      const hasPickupLocationOverrides = await this.columnExists('client_order_configs', 'pickup_location_overrides');
      if (!hasPickupLocationOverrides) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN pickup_location_overrides JSONB DEFAULT '{}'`;
        fixedColumns.push('client_order_configs.pickup_location_overrides');
        console.log('✅ [DB_HEALTH] Added pickup_location_overrides column to client_order_configs');
      }

      // Check if displayLogoOnWaybill column exists
      const hasDisplayLogoOnWaybill = await this.columnExists('client_order_configs', 'displayLogoOnWaybill');
      if (!hasDisplayLogoOnWaybill) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN "displayLogoOnWaybill" BOOLEAN DEFAULT false`;
        fixedColumns.push('client_order_configs.displayLogoOnWaybill');
        console.log('✅ [DB_HEALTH] Added displayLogoOnWaybill column to client_order_configs');
      }

      // Check if logoFileName column exists
      const hasLogoFileName = await this.columnExists('client_order_configs', 'logoFileName');
      if (!hasLogoFileName) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN "logoFileName" TEXT`;
        fixedColumns.push('client_order_configs.logoFileName');
        console.log('✅ [DB_HEALTH] Added logoFileName column to client_order_configs');
      }

      // Check if logoFileSize column exists
      const hasLogoFileSize = await this.columnExists('client_order_configs', 'logoFileSize');
      if (!hasLogoFileSize) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN "logoFileSize" INTEGER`;
        fixedColumns.push('client_order_configs.logoFileSize');
        console.log('✅ [DB_HEALTH] Added logoFileSize column to client_order_configs');
      }

      // Check if logoFileType column exists
      const hasLogoFileType = await this.columnExists('client_order_configs', 'logoFileType');
      if (!hasLogoFileType) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN "logoFileType" TEXT`;
        fixedColumns.push('client_order_configs.logoFileType');
        console.log('✅ [DB_HEALTH] Added logoFileType column to client_order_configs');
      }

      // Check if logoEnabledCouriers column exists
      const hasLogoEnabledCouriers = await this.columnExists('client_order_configs', 'logoEnabledCouriers');
      if (!hasLogoEnabledCouriers) {
        await prisma.$executeRaw`ALTER TABLE client_order_configs ADD COLUMN "logoEnabledCouriers" TEXT`;
        fixedColumns.push('client_order_configs.logoEnabledCouriers');
        console.log('✅ [DB_HEALTH] Added logoEnabledCouriers column to client_order_configs');
      }


    } catch (error) {
      console.error('❌ [DB_HEALTH] Error fixing client_order_configs columns:', error);
    }

    return fixedColumns;
  }

  /**
   * Check and fix rate_limits table
   */
  private async checkAndFixRateLimits(): Promise<string[]> {
    const fixedColumns: string[] = [];
    
    try {
      // Check if key column exists
      const hasKey = await this.columnExists('rate_limits', 'key');
      if (!hasKey) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN key TEXT NOT NULL DEFAULT ''`;
        fixedColumns.push('rate_limits.key');
        console.log('✅ [DB_HEALTH] Added key column to rate_limits');
      }

      // Check if count column exists
      const hasCount = await this.columnExists('rate_limits', 'count');
      if (!hasCount) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN count INTEGER NOT NULL DEFAULT 0`;
        fixedColumns.push('rate_limits.count');
        console.log('✅ [DB_HEALTH] Added count column to rate_limits');
      }

      // Check if windowStart column exists
      const hasWindowStart = await this.columnExists('rate_limits', 'windowStart');
      if (!hasWindowStart) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN "windowStart" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`;
        fixedColumns.push('rate_limits.windowStart');
        console.log('✅ [DB_HEALTH] Added windowStart column to rate_limits');
      }

      // Check if expiresAt column exists
      const hasExpiresAt = await this.columnExists('rate_limits', 'expiresAt');
      if (!hasExpiresAt) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN "expiresAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`;
        fixedColumns.push('rate_limits.expiresAt');
        console.log('✅ [DB_HEALTH] Added expiresAt column to rate_limits');
      }

      // Check if createdAt column exists
      const hasCreatedAt = await this.columnExists('rate_limits', 'createdAt');
      if (!hasCreatedAt) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`;
        fixedColumns.push('rate_limits.createdAt');
        console.log('✅ [DB_HEALTH] Added createdAt column to rate_limits');
      }

      // Check if updatedAt column exists
      const hasUpdatedAt = await this.columnExists('rate_limits', 'updatedAt');
      if (!hasUpdatedAt) {
        await prisma.$executeRaw`ALTER TABLE rate_limits ADD COLUMN "updatedAt" TIMESTAMP`;
        fixedColumns.push('rate_limits.updatedAt');
        console.log('✅ [DB_HEALTH] Added updatedAt column to rate_limits');
      }

    } catch (error) {
      console.error('❌ [DB_HEALTH] Error fixing rate_limits columns:', error);
    }

    return fixedColumns;
  }

  /**
   * Check and fix orders table
   */
  private async checkAndFixOrders(): Promise<string[]> {
    const fixedColumns: string[] = [];
    
    try {
      // Check if shopify_customer_email column exists
      const hasShopifyCustomerEmail = await this.columnExists('orders', 'shopify_customer_email');
      if (!hasShopifyCustomerEmail) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_customer_email TEXT`;
        fixedColumns.push('orders.shopify_customer_email');
        console.log('✅ [DB_HEALTH] Added shopify_customer_email column to orders');
      }

      // Check if shopify_fulfillment_id column exists
      const hasShopifyFulfillmentId = await this.columnExists('orders', 'shopify_fulfillment_id');
      if (!hasShopifyFulfillmentId) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_fulfillment_id TEXT`;
        fixedColumns.push('orders.shopify_fulfillment_id');
        console.log('✅ [DB_HEALTH] Added shopify_fulfillment_id column to orders');
      }

      // Check if shopify_note column exists
      const hasShopifyNote = await this.columnExists('orders', 'shopify_note');
      if (!hasShopifyNote) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_note TEXT`;
        fixedColumns.push('orders.shopify_note');
        console.log('✅ [DB_HEALTH] Added shopify_note column to orders');
      }

      // Check if shopify_order_id column exists
      const hasShopifyOrderId = await this.columnExists('orders', 'shopify_order_id');
      if (!hasShopifyOrderId) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_order_id TEXT`;
        fixedColumns.push('orders.shopify_order_id');
        console.log('✅ [DB_HEALTH] Added shopify_order_id column to orders');
      }

      // Check if shopify_order_number column exists
      const hasShopifyOrderNumber = await this.columnExists('orders', 'shopify_order_number');
      if (!hasShopifyOrderNumber) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_order_number TEXT`;
        fixedColumns.push('orders.shopify_order_number');
        console.log('✅ [DB_HEALTH] Added shopify_order_number column to orders');
      }

      // Check if shopify_tags column exists
      const hasShopifyTags = await this.columnExists('orders', 'shopify_tags');
      if (!hasShopifyTags) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_tags TEXT`;
        fixedColumns.push('orders.shopify_tags');
        console.log('✅ [DB_HEALTH] Added shopify_tags column to orders');
      }

      // Check if shopify_update_error column exists
      const hasShopifyUpdateError = await this.columnExists('orders', 'shopify_update_error');
      if (!hasShopifyUpdateError) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_update_error TEXT`;
        fixedColumns.push('orders.shopify_update_error');
        console.log('✅ [DB_HEALTH] Added shopify_update_error column to orders');
      }

      // Check if shopify_update_status column exists
      const hasShopifyUpdateStatus = await this.columnExists('orders', 'shopify_update_status');
      if (!hasShopifyUpdateStatus) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_update_status TEXT`;
        fixedColumns.push('orders.shopify_update_status');
        console.log('✅ [DB_HEALTH] Added shopify_update_status column to orders');
      }

      // Check if shopify_update_timestamp column exists
      const hasShopifyUpdateTimestamp = await this.columnExists('orders', 'shopify_update_timestamp');
      if (!hasShopifyUpdateTimestamp) {
        await prisma.$executeRaw`ALTER TABLE orders ADD COLUMN shopify_update_timestamp TIMESTAMP`;
        fixedColumns.push('orders.shopify_update_timestamp');
        console.log('✅ [DB_HEALTH] Added shopify_update_timestamp column to orders');
      }

    } catch (error) {
      console.error('❌ [DB_HEALTH] Error fixing orders columns:', error);
    }

    return fixedColumns;
  }

  /**
   * Check if a column exists in a table
   */
  private async columnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = ${tableName} AND column_name = ${columnName}
      `;
      return Array.isArray(result) && result.length > 0;
    } catch (error) {
      console.error(`❌ [DB_HEALTH] Error checking column ${tableName}.${columnName}:`, error);
      return false;
    }
  }
}

/**
 * Safe database query wrapper with automatic health check
 */
export async function safeDatabaseQuery<T>(
  queryFn: () => Promise<T>,
  context: string = 'UNKNOWN'
): Promise<T> {
  try {
    // Initialize database health check if not already done
    const healthCheck = DatabaseHealthCheck.getInstance();
    await healthCheck.initialize();
    
    // Execute the query
    return await queryFn();
  } catch (error) {
    console.error(`❌ [SAFE_QUERY] Error in ${context}:`, error);
    
    // If it's a column missing error, try to fix it
    if (error instanceof Error && error.message.includes('does not exist in the current database')) {
      console.log(`🔧 [SAFE_QUERY] Attempting to fix missing columns for ${context}...`);
      
      try {
        const healthCheck = DatabaseHealthCheck.getInstance();
        await healthCheck.initialize();
        
        // Retry the query after fixing columns
        return await queryFn();
      } catch (retryError) {
        console.error(`❌ [SAFE_QUERY] Retry failed for ${context}:`, retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

// Export singleton instance
export const databaseHealthCheck = DatabaseHealthCheck.getInstance();