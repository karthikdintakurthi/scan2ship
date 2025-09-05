/*
  Warnings:

  - Added the required column `clientName` to the `credit_transactions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."pickup_locations_value_clientId_key";

-- AlterTable
ALTER TABLE "public"."client_order_configs" ADD COLUMN     "enableReferencePrefix" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableResellerFallback" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableThermalPrint" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."credit_transactions" ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "screenshotFileName" TEXT,
ADD COLUMN     "screenshotFileSize" INTEGER,
ADD COLUMN     "screenshotFileType" TEXT,
ADD COLUMN     "utrNumber" TEXT;

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "secret" TEXT,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" TEXT[],
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shopify_integrations" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "webhookSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."shopify_orders" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "shopifyOrderId" TEXT NOT NULL,
    "shopifyOrderName" TEXT NOT NULL,
    "scan2shipOrderId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "syncData" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopify_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_key" ON "public"."api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_key_idx" ON "public"."api_keys"("key");

-- CreateIndex
CREATE INDEX "api_keys_clientId_idx" ON "public"."api_keys"("clientId");

-- CreateIndex
CREATE INDEX "shopify_integrations_clientId_idx" ON "public"."shopify_integrations"("clientId");

-- CreateIndex
CREATE INDEX "shopify_integrations_shopDomain_idx" ON "public"."shopify_integrations"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_integrations_shopDomain_clientId_key" ON "public"."shopify_integrations"("shopDomain", "clientId");

-- CreateIndex
CREATE INDEX "shopify_orders_clientId_idx" ON "public"."shopify_orders"("clientId");

-- CreateIndex
CREATE INDEX "shopify_orders_shopifyOrderId_idx" ON "public"."shopify_orders"("shopifyOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_orders_shopifyOrderId_clientId_key" ON "public"."shopify_orders"("shopifyOrderId", "clientId");

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopify_integrations" ADD CONSTRAINT "shopify_integrations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."shopify_orders" ADD CONSTRAINT "shopify_orders_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
