-- Production already has footerNoteText (applied as 20250924102101, whose
-- SQL file was never committed). IF NOT EXISTS keeps this a no-op on prod
-- and creates the column on shadow DBs / fresh environments so migrate dev
-- stays aligned with schema.prisma.
ALTER TABLE "public"."client_order_configs" ADD COLUMN IF NOT EXISTS "footerNoteText" TEXT;
