/*
  Warnings:

  - You are about to drop the column `enableA5Print` on the `client_order_configs` table. All the data in the column will be lost.
  - You are about to drop the column `enableThermalPrint` on the `client_order_configs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."client_order_configs" DROP COLUMN "enableA5Print",
DROP COLUMN "enableThermalPrint",
ADD COLUMN     "enableFooterNote" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "printmode" TEXT NOT NULL DEFAULT 'standard';
