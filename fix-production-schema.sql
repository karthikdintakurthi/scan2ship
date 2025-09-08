-- Fix Production Database Schema
-- This script adds missing columns and tables to the production database

-- Add missing pickup_location_overrides column to client_order_configs
ALTER TABLE client_order_configs ADD COLUMN IF NOT EXISTS pickup_location_overrides JSONB DEFAULT '{}';

-- Verify the column was added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'client_order_configs' 
AND column_name = 'pickup_location_overrides';

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
