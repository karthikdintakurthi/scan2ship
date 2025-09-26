-- Create cross_app_mappings table if it doesn't exist
-- This script ensures the table exists in production

CREATE TABLE IF NOT EXISTS cross_app_mappings (
    id TEXT PRIMARY KEY,
    scan2shipClientId TEXT NOT NULL,
    catalogClientId TEXT NOT NULL,
    catalogApiKey TEXT NOT NULL,
    isActive BOOLEAN DEFAULT true,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scan2shipClientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_cross_app_mappings_scan2ship_client_id 
ON cross_app_mappings(scan2shipClientId);

-- Create unique constraint to prevent duplicate mappings
CREATE UNIQUE INDEX IF NOT EXISTS idx_cross_app_mappings_unique_client 
ON cross_app_mappings(scan2shipClientId);
