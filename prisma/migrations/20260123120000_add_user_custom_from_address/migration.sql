-- CreateTable
CREATE TABLE "public"."user_custom_from_address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overwriteFromAddress" BOOLEAN NOT NULL DEFAULT false,
    "courierServiceCode" TEXT,
    "customAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_custom_from_address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_custom_from_address_userId_key" ON "public"."user_custom_from_address"("userId");

-- CreateIndex
CREATE INDEX "user_custom_from_address_userId_idx" ON "public"."user_custom_from_address"("userId");

-- AddForeignKey
ALTER TABLE "public"."user_custom_from_address" ADD CONSTRAINT "user_custom_from_address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
