-- Pickup bookings share shipment_operations; existing rows are shipments. Additive only.
ALTER TABLE "shipment_operations" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'shipment';
