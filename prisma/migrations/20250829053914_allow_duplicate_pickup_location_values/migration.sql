-- Drop the existing unique constraint on (value, clientId) if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pickup_locations_value_clientId_key') THEN
        ALTER TABLE "pickup_locations" DROP CONSTRAINT "pickup_locations_value_clientId_key";
    END IF;
END $$;

-- Add a new unique constraint on (label, clientId) to ensure unique names per client
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_label_clientId_key" UNIQUE ("label", "clientId");
