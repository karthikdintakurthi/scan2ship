-- Pending credit recharge claims. Credits are added only when a platform admin
-- approves a request; a UTR can back at most one request.

-- CreateTable
CREATE TABLE "public"."credit_recharge_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requestedById" TEXT,
    "amount" INTEGER NOT NULL,
    "transactionRef" TEXT NOT NULL,
    "utrNumber" TEXT,
    "paymentDetails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "creditTransactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credit_recharge_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "credit_recharge_requests_utrNumber_key" ON "public"."credit_recharge_requests"("utrNumber");

-- CreateIndex
CREATE INDEX "credit_recharge_requests_status_createdAt_idx" ON "public"."credit_recharge_requests"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "credit_recharge_requests_clientId_transactionRef_key" ON "public"."credit_recharge_requests"("clientId", "transactionRef");

-- AddForeignKey
ALTER TABLE "public"."credit_recharge_requests" ADD CONSTRAINT "credit_recharge_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_recharge_requests" ADD CONSTRAINT "credit_recharge_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."credit_recharge_requests" ADD CONSTRAINT "credit_recharge_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
