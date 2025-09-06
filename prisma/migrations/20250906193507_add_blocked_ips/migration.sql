-- CreateTable
CREATE TABLE "public"."blocked_ips" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_ips_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "blocked_ips_ipAddress_key" ON "public"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_ipAddress_idx" ON "public"."blocked_ips"("ipAddress");

-- CreateIndex
CREATE INDEX "blocked_ips_expiresAt_idx" ON "public"."blocked_ips"("expiresAt");
