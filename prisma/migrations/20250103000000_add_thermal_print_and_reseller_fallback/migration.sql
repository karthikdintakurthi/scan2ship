-- Migration: 20250103000000_add_thermal_print_and_reseller_fallback
-- Description: Add missing enableThermalPrint and enableResellerFallback columns to client_order_configs table

-- Add missing columns to client_order_configs table
ALTER TABLE "public"."client_order_configs" 
ADD COLUMN "enableResellerFallback" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enableThermalPrint" BOOLEAN NOT NULL DEFAULT false;
