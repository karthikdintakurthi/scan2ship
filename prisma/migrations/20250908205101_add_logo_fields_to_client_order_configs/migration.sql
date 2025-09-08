-- AlterTable
ALTER TABLE "public"."client_order_configs" ADD COLUMN     "displayLogoOnWaybill" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "logoFileName" TEXT,
ADD COLUMN     "logoFileSize" INTEGER,
ADD COLUMN     "logoFileType" TEXT;
