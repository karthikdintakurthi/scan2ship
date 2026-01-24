-- Create otp_sessions table for storing OTP verification sessions
-- This table is used to store OTP sessions across serverless instances

CREATE TABLE IF NOT EXISTS "otp_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better query performance
CREATE UNIQUE INDEX IF NOT EXISTS "otp_sessions_sessionId_key" ON "otp_sessions"("sessionId");
CREATE INDEX IF NOT EXISTS "otp_sessions_expiresAt_idx" ON "otp_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "otp_sessions_mobile_idx" ON "otp_sessions"("mobile");
