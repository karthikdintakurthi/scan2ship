-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN     "last_shopify_attempt" TIMESTAMP(3),
ADD COLUMN     "shopify_api_error" TEXT,
ADD COLUMN     "shopify_api_status" TEXT,
ADD COLUMN     "shopify_fulfillment_id" TEXT,
ADD COLUMN     "shopify_status" TEXT,
ADD COLUMN     "shopify_tracking_number" TEXT;
