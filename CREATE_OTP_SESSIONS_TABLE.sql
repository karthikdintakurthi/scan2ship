-- Run this SQL directly in your database to create the otp_sessions table
-- You can run this using psql, pgAdmin, or any PostgreSQL client

CREATE TABLE IF NOT EXISTS "otp_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- Create unique index on sessionId
CREATE UNIQUE INDEX IF NOT EXISTS "otp_sessions_sessionId_key" ON "otp_sessions"("sessionId");

-- Create index on expiresAt for cleanup queries
CREATE INDEX IF NOT EXISTS "otp_sessions_expiresAt_idx" ON "otp_sessions"("expiresAt");

-- Create index on mobile for lookup queries
CREATE INDEX IF NOT EXISTS "otp_sessions_mobile_idx" ON "otp_sessions"("mobile");
