-- CreateTable
CREATE TABLE "public"."client_order_configs" (
    "id" TEXT NOT NULL,
    "defaultProductDescription" TEXT NOT NULL DEFAULT 'ARTIFICAL JEWELLERY',
    "defaultPackageValue" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "defaultWeight" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "defaultTotalItems" INTEGER NOT NULL DEFAULT 1,
    "codEnabledByDefault" BOOLEAN NOT NULL DEFAULT false,
    "defaultCodAmount" DOUBLE PRECISION,
    "minPackageValue" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "maxPackageValue" DOUBLE PRECISION NOT NULL DEFAULT 100000,
    "minWeight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxWeight" DOUBLE PRECISION NOT NULL DEFAULT 50000,
    "minTotalItems" INTEGER NOT NULL DEFAULT 1,
    "maxTotalItems" INTEGER NOT NULL DEFAULT 100,
    "requireProductDescription" BOOLEAN NOT NULL DEFAULT true,
    "requirePackageValue" BOOLEAN NOT NULL DEFAULT true,
    "requireWeight" BOOLEAN NOT NULL DEFAULT true,
    "requireTotalItems" BOOLEAN NOT NULL DEFAULT true,
    "clientId" TEXT NOT NULL,

    CONSTRAINT "client_order_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_order_configs_clientId_key" ON "public"."client_order_configs"("clientId");

-- AddForeignKey
ALTER TABLE "public"."client_order_configs" ADD CONSTRAINT "client_order_configs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
