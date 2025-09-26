-- Scan2Ship QA Database Migration
-- This script migrates essential data from local to QA environment

-- 1. Ensure cross_app_mappings table exists
CREATE TABLE IF NOT EXISTS cross_app_mappings (
    id TEXT PRIMARY KEY,
    "scan2shipClientId" TEXT NOT NULL,
    "catalogClientId" TEXT NOT NULL,
    "catalogApiKey" TEXT NOT NULL,
    "isActive" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_cross_app_mappings_scan2ship_client'
    ) THEN
        ALTER TABLE cross_app_mappings 
        ADD CONSTRAINT fk_cross_app_mappings_scan2ship_client 
        FOREIGN KEY ("scan2shipClientId") REFERENCES clients(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Insert cross-app mappings from local backup
-- Replace these with actual data from your local backup

-- Example mapping (replace with your actual data):
INSERT INTO cross_app_mappings (
    id, 
    "scan2shipClientId", 
    "catalogClientId", 
    "catalogApiKey", 
    "isActive", 
    "createdAt", 
    "updatedAt"
) VALUES (
    'cmg0vfyvl0001y709lto2varq',
    'cmfohvqxb0001jp04hqvisj49',  -- Vanitha Fashion Jewelry client ID
    'cmfohc9q00001l104dfa1qy8n',  -- Catalog App client ID
    'cat_sk_d2d906dd5b9c28e4d7bbe8e58f140603de86de5f096bfdfaf6192064210a29ae',  -- API Key
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO UPDATE SET
    "scan2shipClientId" = EXCLUDED."scan2shipClientId",
    "catalogClientId" = EXCLUDED."catalogClientId",
    "catalogApiKey" = EXCLUDED."catalogApiKey",
    "isActive" = EXCLUDED."isActive",
    "updatedAt" = CURRENT_TIMESTAMP;

-- 3. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cross_app_mappings_scan2ship_client_id 
ON cross_app_mappings("scan2shipClientId");

CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_app_mappings_unique_client 
ON cross_app_mappings("scan2shipClientId");

-- 4. Verify the migration
SELECT 
    cam.id,
    c.name as scan2ship_client_name,
    cam."catalogClientId",
    cam."isActive",
    cam."createdAt"
FROM cross_app_mappings cam
LEFT JOIN clients c ON c.id = cam."scan2shipClientId"
ORDER BY cam."createdAt" DESC;
