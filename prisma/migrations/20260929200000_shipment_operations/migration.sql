-- Shipment previews and creations requested through MCP. Additive only.

CREATE TABLE IF NOT EXISTS "shipment_operations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "grantId" TEXT,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "creditCost" INTEGER NOT NULL,
    "orderId" INTEGER,
    "result" JSONB,
    "error" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "shipment_operations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shipment_operations_tenantId_createdAt_idx" ON "shipment_operations"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "shipment_operations_tenantId_status_idx" ON "shipment_operations"("tenantId", "status");

ALTER TABLE "shipment_operations" ADD CONSTRAINT "shipment_operations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipment_operations" ADD CONSTRAINT "shipment_operations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
