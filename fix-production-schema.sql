-- Fix Production Database Schema
-- This script adds missing columns and tables to the production database

-- Add missing columns to client_order_configs table
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS pickup_location_overrides JSONB DEFAULT '{}';
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS displayLogoOnWaybill BOOLEAN DEFAULT false;
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS logoFileName TEXT;
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS logoFileSize INTEGER;
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS logoFileType TEXT;
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS logoEnabledCouriers TEXT;
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS enableAltMobileNumber BOOLEAN DEFAULT false;

-- Add missing columns to rate_limits table
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS key TEXT DEFAULT '';
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS count INTEGER DEFAULT 0;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS windowStart TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS expiresAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add missing Shopify fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_customer_email TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_fulfillment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_order_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_tags TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_update_error TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_update_status TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopify_update_timestamp TIMESTAMP;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'client_order_configs' 
AND column_name IN (
    'pickup_location_overrides',
    'displayLogoOnWaybill',
    'logoFileName',
    'logoFileSize',
    'logoFileType',
    'logoEnabledCouriers',
    'enableAltMobileNumber'
);

-- Check if all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'pickup_location_order_configs',
    'pickup_location_shopify_configs', 
    'user_pickup_locations',
    'api_keys',
    'shopify_integrations',
    'shopify_orders'
);

-- If any tables are missing, they need to be created via Prisma migrations
-- Run: npx prisma migrate deploy
