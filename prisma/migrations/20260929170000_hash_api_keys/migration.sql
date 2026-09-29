-- Store API keys only as SHA-256 hashes, keep a short prefix for display,
-- record who created each key, and replace wildcard grants with the scopes
-- that exist today. Written defensively because api_keys has drifted between
-- environments.

ALTER TABLE "public"."api_keys" ADD COLUMN IF NOT EXISTS "keyPrefix" TEXT;
ALTER TABLE "public"."api_keys" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

UPDATE "public"."api_keys"
SET "keyPrefix" = left("key", 12),
    "key" = 'sha256:' || encode(sha256(convert_to("key", 'UTF8')), 'hex')
WHERE "key" NOT LIKE 'sha256:%';

UPDATE "public"."api_keys"
SET "permissions" = ARRAY['orders:read', 'orders:write', 'courier-services:read', 'courier-services:write']
WHERE '*' = ANY("permissions");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'secret'
  ) THEN
    UPDATE "public"."api_keys" SET "secret" = NULL;
  END IF;
END $$;
