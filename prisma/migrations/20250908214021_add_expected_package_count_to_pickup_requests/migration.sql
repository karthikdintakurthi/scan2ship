-- AlterTable
ALTER TABLE "public"."pickup_requests" ADD COLUMN     "expected_package_count" INTEGER NOT NULL DEFAULT 1;
