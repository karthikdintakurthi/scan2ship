-- AlterTable
ALTER TABLE "public"."courier_services" ADD COLUMN     "baseRate" DOUBLE PRECISION,
ADD COLUMN     "codCharges" DOUBLE PRECISION,
ADD COLUMN     "estimatedDays" INTEGER,
ADD COLUMN     "freeShippingThreshold" DOUBLE PRECISION,
ADD COLUMN     "maxWeight" DOUBLE PRECISION,
ADD COLUMN     "minWeight" DOUBLE PRECISION,
ADD COLUMN     "ratePerKg" DOUBLE PRECISION;
