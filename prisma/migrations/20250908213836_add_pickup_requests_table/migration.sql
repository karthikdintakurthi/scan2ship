-- CreateTable
CREATE TABLE "public"."pickup_requests" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pickup_date" TEXT NOT NULL,
    "pickup_time" TEXT NOT NULL,
    "pickup_address" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "contact_phone" TEXT NOT NULL,
    "special_instructions" TEXT,
    "pickup_location" TEXT NOT NULL,
    "delhivery_request_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pickup_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pickup_requests_clientId_idx" ON "public"."pickup_requests"("clientId");

-- CreateIndex
CREATE INDEX "pickup_requests_userId_idx" ON "public"."pickup_requests"("userId");

-- CreateIndex
CREATE INDEX "pickup_requests_status_idx" ON "public"."pickup_requests"("status");

-- CreateIndex
CREATE INDEX "pickup_requests_pickup_date_idx" ON "public"."pickup_requests"("pickup_date");

-- AddForeignKey
ALTER TABLE "public"."pickup_requests" ADD CONSTRAINT "pickup_requests_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pickup_requests" ADD CONSTRAINT "pickup_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
