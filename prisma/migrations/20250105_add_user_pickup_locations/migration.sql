-- CreateTable
CREATE TABLE "user_pickup_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pickup_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_pickup_locations_userId_pickupLocationId_key" ON "user_pickup_locations"("userId", "pickupLocationId");

-- AddForeignKey
ALTER TABLE "user_pickup_locations" ADD CONSTRAINT "user_pickup_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_pickup_locations" ADD CONSTRAINT "user_pickup_locations_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "pickup_locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
