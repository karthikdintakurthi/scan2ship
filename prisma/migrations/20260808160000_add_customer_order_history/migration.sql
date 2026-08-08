-- Customer order history feature (per-client flag + lookback window).
-- Additive only: two new columns with defaults. No existing data is modified.

ALTER TABLE "public"."client_order_configs"
  ADD COLUMN IF NOT EXISTS "enableCustomerOrderHistory" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "public"."client_order_configs"
  ADD COLUMN IF NOT EXISTS "customerOrderHistoryDays" INTEGER NOT NULL DEFAULT 30;

-- The lookup filters orders by client + mobile (and reseller_mobile) within a
-- date window. The orders table has no indexes at all today, so add the ones
-- this query needs rather than adding another sequential scan.
CREATE INDEX IF NOT EXISTS "orders_clientId_mobile_created_at_idx"
  ON "public"."orders" ("clientId", "mobile", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "orders_clientId_reseller_mobile_created_at_idx"
  ON "public"."orders" ("clientId", "reseller_mobile", "created_at" DESC);
