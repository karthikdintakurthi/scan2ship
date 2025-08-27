/*
  Warnings:

  - You are about to drop the column `label` on the `courier_services` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `courier_services` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[code,clientId]` on the table `courier_services` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `courier_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `courier_services` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."courier_services_value_clientId_key";

-- AlterTable
ALTER TABLE "public"."courier_services" DROP COLUMN "label",
DROP COLUMN "value",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "courier_services_code_clientId_key" ON "public"."courier_services"("code", "clientId");
