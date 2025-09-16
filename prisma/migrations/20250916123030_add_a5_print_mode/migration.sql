-- AlterTable
ALTER TABLE "public"."client_order_configs" ADD COLUMN     "enableA5Print" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable  
ALTER TABLE "public"."client_order_configs" ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "public"."client_order_configs" ADD COLUMN     "pickup_location_overrides" JSONB DEFAULT '{}';

-- AlterTable
ALTER TABLE "public"."client_order_configs" ALTER COLUMN "displayLogoOnWaybill" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."client_order_configs" ALTER COLUMN "enableAltMobileNumber" DROP NOT NULL;
