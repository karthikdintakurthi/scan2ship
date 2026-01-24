-- CreateTable
CREATE TABLE "otp_sessions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "otp" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "otp_sessions_sessionId_key" ON "otp_sessions"("sessionId");

-- CreateIndex
CREATE INDEX "otp_sessions_expiresAt_idx" ON "otp_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "otp_sessions_mobile_idx" ON "otp_sessions"("mobile");
