-- CreateTable
CREATE TABLE "public"."client_credit_costs" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_credit_costs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_credit_costs_clientId_feature_key" ON "public"."client_credit_costs"("clientId", "feature");

-- AddForeignKey
ALTER TABLE "public"."client_credit_costs" ADD CONSTRAINT "client_credit_costs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
