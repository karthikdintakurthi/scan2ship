-- ============================================
-- PRODUCTION DEPLOYMENT: Create otp_sessions table
-- ============================================
-- This SQL is SAFE to run in production
-- It only creates a new table and will NOT affect existing data
-- Uses IF NOT EXISTS to prevent errors if run multiple times
-- ============================================

-- Create the otp_sessions table
CREATE TABLE IF NOT EXISTS "otp_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on sessionId (required for upsert operations)
CREATE UNIQUE INDEX IF NOT EXISTS "otp_sessions_sessionId_key" ON "otp_sessions"("sessionId");

-- Create index on expiresAt for efficient cleanup queries
CREATE INDEX IF NOT EXISTS "otp_sessions_expiresAt_idx" ON "otp_sessions"("expiresAt");

-- Create index on mobile for lookup queries
CREATE INDEX IF NOT EXISTS "otp_sessions_mobile_idx" ON "otp_sessions"("mobile");

-- ============================================
-- Verification Query (run after deployment)
-- ============================================
-- SELECT * FROM information_schema.tables 
-- WHERE table_name = 'otp_sessions';
-- ============================================
