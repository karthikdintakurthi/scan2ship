-- Add slug column to clients table
ALTER TABLE "public"."clients" ADD COLUMN "slug" TEXT;

-- Create unique index for slug
CREATE UNIQUE INDEX "clients_slug_key" ON "public"."clients"("slug");

-- Update existing records with slug based on companyName (lowercase, replace spaces with hyphens)
UPDATE "public"."clients" 
SET "slug" = LOWER(REPLACE(REPLACE(REPLACE("companyName", ' ', '-'), '.', ''), '_', '-'))
WHERE "slug" IS NULL;
