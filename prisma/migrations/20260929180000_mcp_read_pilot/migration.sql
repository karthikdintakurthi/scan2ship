-- MCP OAuth grants and order-list indexes for the customer MCP read pilot.
-- Additive only.

CREATE TABLE IF NOT EXISTS "mcp_oauth_clients" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "redirectUris" TEXT[] NOT NULL,
    "tokenEndpointAuthMethod" TEXT NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mcp_grants" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "oauthClientId" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL,
    "policyVersion" INTEGER NOT NULL DEFAULT 1,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    CONSTRAINT "mcp_grants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mcp_authorization_codes" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_authorization_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "mcp_refresh_tokens" (
    "id" TEXT NOT NULL,
    "grantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "mcp_authorization_codes_codeHash_key" ON "mcp_authorization_codes"("codeHash");
CREATE UNIQUE INDEX IF NOT EXISTS "mcp_refresh_tokens_tokenHash_key" ON "mcp_refresh_tokens"("tokenHash");
CREATE INDEX IF NOT EXISTS "mcp_grants_tenantId_userId_idx" ON "mcp_grants"("tenantId", "userId");
CREATE INDEX IF NOT EXISTS "mcp_grants_userId_idx" ON "mcp_grants"("userId");
CREATE INDEX IF NOT EXISTS "mcp_grants_oauthClientId_idx" ON "mcp_grants"("oauthClientId");
CREATE INDEX IF NOT EXISTS "mcp_authorization_codes_expiresAt_idx" ON "mcp_authorization_codes"("expiresAt");
CREATE INDEX IF NOT EXISTS "mcp_refresh_tokens_grantId_idx" ON "mcp_refresh_tokens"("grantId");
CREATE INDEX IF NOT EXISTS "mcp_refresh_tokens_familyId_idx" ON "mcp_refresh_tokens"("familyId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_grants_tenantId_fkey'
  ) THEN
    ALTER TABLE "mcp_grants"
      ADD CONSTRAINT "mcp_grants_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_grants_userId_fkey'
  ) THEN
    ALTER TABLE "mcp_grants"
      ADD CONSTRAINT "mcp_grants_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_grants_oauthClientId_fkey'
  ) THEN
    ALTER TABLE "mcp_grants"
      ADD CONSTRAINT "mcp_grants_oauthClientId_fkey"
      FOREIGN KEY ("oauthClientId") REFERENCES "mcp_oauth_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_authorization_codes_grantId_fkey'
  ) THEN
    ALTER TABLE "mcp_authorization_codes"
      ADD CONSTRAINT "mcp_authorization_codes_grantId_fkey"
      FOREIGN KEY ("grantId") REFERENCES "mcp_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_refresh_tokens_grantId_fkey'
  ) THEN
    ALTER TABLE "mcp_refresh_tokens"
      ADD CONSTRAINT "mcp_refresh_tokens_grantId_fkey"
      FOREIGN KEY ("grantId") REFERENCES "mcp_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "orders_clientId_created_at_idx" ON "orders"("clientId", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "orders_clientId_tracking_id_idx" ON "orders"("clientId", "tracking_id");
CREATE INDEX IF NOT EXISTS "orders_clientId_reference_number_idx" ON "orders"("clientId", "reference_number");
