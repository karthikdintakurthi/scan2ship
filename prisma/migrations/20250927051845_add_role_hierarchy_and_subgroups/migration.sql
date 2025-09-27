-- AlterTable
ALTER TABLE "public"."api_keys" ALTER COLUMN "permissions" SET DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "public"."users" ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "parentUserId" TEXT,
ALTER COLUMN "role" SET DEFAULT 'child_user';

-- CreateTable
CREATE TABLE "public"."sub_groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "clientId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sub_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_sub_groups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sub_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_pickup_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pickup_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."cross_app_mappings" (
    "id" TEXT NOT NULL,
    "scan2shipClientId" TEXT NOT NULL,
    "catalogClientId" TEXT NOT NULL,
    "catalogApiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cross_app_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sub_groups_clientId_idx" ON "public"."sub_groups"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "sub_groups_name_clientId_key" ON "public"."sub_groups"("name", "clientId");

-- CreateIndex
CREATE INDEX "user_sub_groups_userId_idx" ON "public"."user_sub_groups"("userId");

-- CreateIndex
CREATE INDEX "user_sub_groups_subGroupId_idx" ON "public"."user_sub_groups"("subGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "user_sub_groups_userId_subGroupId_key" ON "public"."user_sub_groups"("userId", "subGroupId");

-- CreateIndex
CREATE INDEX "user_pickup_locations_userId_idx" ON "public"."user_pickup_locations"("userId");

-- CreateIndex
CREATE INDEX "user_pickup_locations_pickupLocationId_idx" ON "public"."user_pickup_locations"("pickupLocationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_pickup_locations_userId_pickupLocationId_key" ON "public"."user_pickup_locations"("userId", "pickupLocationId");

-- CreateIndex
CREATE INDEX "cross_app_mappings_catalogClientId_idx" ON "public"."cross_app_mappings"("catalogClientId");

-- CreateIndex
CREATE INDEX "cross_app_mappings_isActive_idx" ON "public"."cross_app_mappings"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "cross_app_mappings_scan2shipClientId_key" ON "public"."cross_app_mappings"("scan2shipClientId");

-- CreateIndex
CREATE INDEX "users_parentUserId_idx" ON "public"."users"("parentUserId");

-- CreateIndex
CREATE INDEX "users_createdBy_idx" ON "public"."users"("createdBy");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sub_groups" ADD CONSTRAINT "sub_groups_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sub_groups" ADD CONSTRAINT "user_sub_groups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_sub_groups" ADD CONSTRAINT "user_sub_groups_subGroupId_fkey" FOREIGN KEY ("subGroupId") REFERENCES "public"."sub_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_pickup_locations" ADD CONSTRAINT "user_pickup_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_pickup_locations" ADD CONSTRAINT "user_pickup_locations_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "public"."pickup_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."cross_app_mappings" ADD CONSTRAINT "cross_app_mappings_scan2shipClientId_fkey" FOREIGN KEY ("scan2shipClientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
