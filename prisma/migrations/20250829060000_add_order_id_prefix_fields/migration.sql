-- Add missing fields to client_order_configs table
ALTER TABLE "public"."client_order_configs" 
ADD COLUMN "enableResellerFallback" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "enableOrderIdPrefix" BOOLEAN NOT NULL DEFAULT true;
