-- Drop the existing unique constraint on (value, clientId)
ALTER TABLE "pickup_locations" DROP CONSTRAINT "pickup_locations_value_clientId_key";

-- Add a new unique constraint on (label, clientId) to ensure unique names per client
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_label_clientId_key" UNIQUE ("label", "clientId");
