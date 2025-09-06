/*
  Warnings:

  - You are about to drop the column `token` on the `sessions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sessionToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[refreshToken]` on the table `sessions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `ipAddress` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `permissions` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refreshToken` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `role` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sessionToken` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userAgent` to the `sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."sessions_token_key";

-- First, add new columns with default values
ALTER TABLE "public"."sessions" 
ADD COLUMN     "ipAddress" TEXT DEFAULT 'unknown',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "permissions" TEXT DEFAULT '[]',
ADD COLUMN     "refreshToken" TEXT DEFAULT '',
ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "role" TEXT DEFAULT 'user',
ADD COLUMN     "sessionToken" TEXT DEFAULT '',
ADD COLUMN     "userAgent" TEXT DEFAULT 'unknown';

-- Update existing rows with proper values
UPDATE "public"."sessions" 
SET 
  "sessionToken" = "token",
  "refreshToken" = "token" || '_refresh',
  "ipAddress" = 'unknown',
  "userAgent" = 'unknown',
  "role" = 'user',
  "permissions" = '[]'
WHERE "sessionToken" = '';

-- Now make the required columns NOT NULL
ALTER TABLE "public"."sessions" 
ALTER COLUMN "ipAddress" SET NOT NULL,
ALTER COLUMN "permissions" SET NOT NULL,
ALTER COLUMN "refreshToken" SET NOT NULL,
ALTER COLUMN "role" SET NOT NULL,
ALTER COLUMN "sessionToken" SET NOT NULL,
ALTER COLUMN "userAgent" SET NOT NULL;

-- Drop the old token column
ALTER TABLE "public"."sessions" DROP COLUMN "token";

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "userId" TEXT,
    "clientId" TEXT,
    "sessionId" TEXT,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "resource" TEXT,
    "action" TEXT,
    "details" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_eventType_idx" ON "public"."audit_logs"("eventType");

-- CreateIndex
CREATE INDEX "audit_logs_severity_idx" ON "public"."audit_logs"("severity");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "public"."audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_clientId_idx" ON "public"."audit_logs"("clientId");

-- CreateIndex
CREATE INDEX "audit_logs_ipAddress_idx" ON "public"."audit_logs"("ipAddress");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "public"."audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_tags_idx" ON "public"."audit_logs"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "public"."sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "public"."sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_sessionToken_idx" ON "public"."sessions"("sessionToken");

-- CreateIndex
CREATE INDEX "sessions_refreshToken_idx" ON "public"."sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_isActive_idx" ON "public"."sessions"("isActive");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "public"."sessions"("expiresAt");
