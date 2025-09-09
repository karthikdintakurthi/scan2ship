-- Add tracking_status column to orders table
ALTER TABLE "public"."orders" ADD COLUMN "tracking_status" TEXT DEFAULT 'pending';
