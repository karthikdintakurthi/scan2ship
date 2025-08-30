-- Add enhanced fields to credit_transactions table
-- This script adds the missing fields that are needed for the enhanced credit system

-- Add clientName field
ALTER TABLE "credit_transactions" 
ADD COLUMN "clientName" TEXT;

-- Add utrNumber field
ALTER TABLE "credit_transactions" 
ADD COLUMN "utrNumber" TEXT;

-- Add screenshotFileName field
ALTER TABLE "credit_transactions" 
ADD COLUMN "screenshotFileName" TEXT;

-- Add screenshotFileSize field
ALTER TABLE "credit_transactions" 
ADD COLUMN "screenshotFileSize" INTEGER;

-- Add screenshotFileType field
ALTER TABLE "credit_transactions" 
ADD COLUMN "screenshotFileType" TEXT;

-- Update existing records to have a default clientName
-- This will be populated from the clients table
UPDATE "credit_transactions" 
SET "clientName" = 'Legacy Client' 
WHERE "clientName" IS NULL;

-- Make clientName NOT NULL after setting default values
ALTER TABLE "credit_transactions" 
ALTER COLUMN "clientName" SET NOT NULL;

-- Add comments to document the new fields
COMMENT ON COLUMN "credit_transactions"."clientName" IS 'Store client name for easy reference';
COMMENT ON COLUMN "credit_transactions"."utrNumber" IS 'UTR number for payment tracking';
COMMENT ON COLUMN "credit_transactions"."screenshotFileName" IS 'Name of uploaded screenshot file';
COMMENT ON COLUMN "credit_transactions"."screenshotFileSize" IS 'Size of screenshot file in bytes';
COMMENT ON COLUMN "credit_transactions"."screenshotFileType" IS 'MIME type of screenshot file';

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'credit_transactions' 
ORDER BY ordinal_position;
