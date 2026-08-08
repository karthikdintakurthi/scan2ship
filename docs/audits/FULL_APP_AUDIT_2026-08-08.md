# Scan2Ship — Full Application Audit

**Date:** 2026-08-08 · **Commit:** `524d37a` (main) · **Scale:** 62,347 LOC, 212 TS/TSX files, 87 API routes, 27 Prisma models

Six parallel specialist audits (auth/authz, injection & secrets, data layer, API correctness, frontend, build/deps/CI). Every finding below cites `file:line` and was read in source. Claims marked **[verified]** were independently re-confirmed by hand after the agent reported them.

---

## Executive summary

The application is a multi-tenant logistics SaaS handling real money (credits), real shipments (Delhivery waybills), and customer PII. **The tenant boundary is not enforced, and 13 endpoints have no authentication at all.**

| Area | State |
|---|---|
| Authentication | 13 handlers with zero auth; 1 allows unauthenticated `master_admin` creation |
| Authorization | Primary admin gate fails **open**; 8 confirmed cross-tenant data paths |
| Credits (billing) | Double-spend race; balance can go negative; credits mintable from request body |
| Data integrity | `orders` table has **zero indexes**; tracking results zipped positionally onto wrong orders |
| Build gates | TS suppressed (**323 errors**), ESLint **crashes**, Jest **0 tests run**, **no CI** |
| Secrets | Live carrier API keys logged in plaintext; real `JWT_SECRET` in git history |

The build-gate collapse is the root cause of much of the rest: `next.config.ts` disables both TypeScript and ESLint at build time, and several of the CRITICAL findings below are errors the compiler already flags.

---

## CRITICAL

### 1. Unauthenticated creation of a platform admin in any tenant **[verified]**
`src/app/api/auth/register-user/route.ts` — zero auth calls in the file.
```ts
const { name, email, password, clientId, role = 'user' } = await request.json();  // :7-13
const user = await prisma.users.create({
  data: { id: ..., email, name, password: hashedPassword, role, isActive: true, clientId, ... }  // :62-73
});
```
`role` and `clientId` come straight from the body with no allowlist (`users.role` is an unconstrained `String`). An anonymous `POST` with `{"role":"master_admin","clientId":"<any tenant>"}` then a normal login yields platform admin. **This alone is full compromise.** A `validRoles` allowlist exists at `src/app/api/users/route.ts:264` — it was simply never applied here.

### 2. The admin role gate fails OPEN **[verified]**
`UserRole` (`src/lib/auth-middleware.ts:10-16`) defines `CHILD_USER, USER, CLIENT_ADMIN, SUPER_ADMIN, MASTER_ADMIN`. There is **no `ADMIN`** — yet 11 route files pass `requiredRole: UserRole.ADMIN`, i.e. `undefined`.

JS destructuring defaults fire on explicit `undefined`:
```ts
const { requiredRole = UserRole.USER, ... } = options;   // auth-middleware.ts:332
```
So the gate silently becomes `'user'`. Confirmed in Node: `user`, `client_admin`, `super_admin`, `master_admin` all pass; only `child_user` is rejected. Every "admin-only" route is really "any non-child account of any tenant".

Affected: `admin/users`, `admin/credits`, `admin/credits/[clientId]{,/costs,/transactions}`, `admin/client-configurations`, `admin/settings/clients/[id]`, `admin/database-health`, `admin/jwt-secrets`, `admin/system-config`, `analytics/platform`, `test-clear-cache`.

Consequences: any `user`-role account can dump **every user in the platform including bcrypt hashes** (`admin/users/route.ts:50` uses `include`, not `select`), read **plaintext Delhivery keys for any tenant** (`admin/settings/clients/[id]/route.ts:159` — comment reads `// Return actual API key, not masked`), and **mint or zero any tenant's credit balance** (`admin/credits/[clientId]/route.ts:39`).

### 3. Raw mass assignment + IDOR on orders **[verified]**
`src/app/api/orders/[id]/route.ts:136-139`, reachable at `CHILD_USER`:
```ts
const order = await prisma.orders.update({ where: { id: orderId }, data: body })
```
No tenant filter, no field allowlist. `PUT {"clientId":"<victim>"}` moves records across tenants; `{"tracking_status":"delivered"}` forges shipment state. The `GET` in the same file (`:40`) is likewise unscoped — integer IDs enumerate every tenant's customer PII. `DELETE` in the same file *is* correctly scoped (`:198`), so this is oversight, not design.

### 4. Unauthenticated endpoints that spend money or mutate production **[verified]**
Confirmed zero auth references in each file:

| Endpoint | Effect |
|---|---|
| `orders/[id]/fulfill` | Buys a real Delhivery waybill on the order's tenant's account, fulfills their Shopify order, emails their customer. Sequential integer IDs. |
| `delhivery/update-order` | Reroutes in-flight parcels — selects the carrier key by attacker-supplied `pickupLocation` string, POSTs to `track.delhivery.com/api/p/edit`. Logs the key in full (`:59`). |
| `admin/fix-database` | `$executeRaw` DDL (`ALTER TABLE "public"."orders" ADD COLUMN ...`) against production. |
| `admin/update-order-status` | Arbitrary status writes to any order, any tenant. |
| `webhooks/delhivery` | No HMAC, no replay window. `updateMany({ where: { tracking_id: awb } })` — no `clientId`. Sends attacker-controlled tracking URLs to real customers. |
| `tracking` | Bulk PII scrape: any mobile number returns name, full address, COD amount, tracking ID **across all tenants**. Indian mobile keyspace is enumerable. |
| `cron/test-tracking` | `export async function GET(request) { return POST(request); }` — any crawler mutates order statuses. |
| `catalog-simple` | Hardcoded tenant `'master-client-1756272680179'`; proxies the Catalog API on that tenant's key. |

Plus `debug-env`, `test-auth` (echoes the decoded JWT to any bearer), `test-catalog`, `test-admin`, `cache/clear`.

### 5. Super-admin auth commented out **[verified]**
`src/app/api/admin/cross-app-mappings/route.ts:28` and `:82`, and `[id]/route.ts:94`:
```ts
// Temporarily bypass super admin authentication for testing
// TODO: Restore authentication in production
// const authResult = await authorizeSuperAdmin(request);
```
Anonymous `GET` returns `findMany()` unfiltered — **every tenant's `catalogApiKey` and `catalogClientId`**, plus the full client roster. `DELETE` destroys any tenant's integration. (`PUT` in the `[id]` route *is* protected — inconsistent.)

### 6. Credits: mintable, raceable, and can go negative **[verified]**
- **Mintable.** `credits/verify-payment/route.ts:54-121` grants credits from `body.amount` with **no payment-gateway call**. Idempotency is a substring match (`description: { contains: transactionRef }`). `POST {"transactionRef":"x1","amount":100000000}` mints 100M credits.
- **Lost update.** `credit-service.ts:144-166` — inside `$transaction`, but a read-modify-write at READ COMMITTED with no row lock and no `isolationLevel` set anywhere:
  ```ts
  const credits = await tx.client_credits.findUnique({ where: { clientId } });
  if (credits.balance < amount) throw new Error('Insufficient credits');
  await tx.client_credits.update({ data: { balance: credits.balance - amount, ... } });
  ```
  Two concurrent deducts of 1 from a balance of 10 both read 10, both write 9. Fix: `{ balance: { decrement: amount } }` guarded by `updateMany({ where: { clientId, balance: { gte: amount } } })`.
- **Negative balances.** `external/orders/route.ts:123-164` — three statements, **no `$transaction`**, unconditional `decrement` with no `gte` guard. The ledger writes `balance: clientCredits.balance - 1` from the stale pre-read.
- **Failure swallowed.** `orders/route.ts:271-279` catches deduction failure and comments `// We don't fail the order creation if credit deduction fails`. Waybill bought, order created, **0 credits charged**, HTTP 200.
- **Retry is free.** `orders/[id]/retry-delhivery` buys a fresh waybill and never imports `CreditService`.
- **Shopify orders are free.** `shopify/webhooks/route.ts:900` writes `prisma.orders.create` directly, bypassing the credit check entirely.

### 7. Any user can mint a wildcard API key **[verified]**
`api-keys/route.ts:96` takes `permissions` from the body unvalidated; `api-key-auth.ts:77` honours `'*'`. `POST {"name":"x","permissions":["*"]}` from an ordinary `USER` satisfies every scope check in the app.

### 8. Unauthenticated SSRF exfiltrating `SHOPIFY_CLIENT_SECRET` **[verified]**
`shopify/auth/route.ts:86` → `:124`, with no validation of `shop` in between:
```ts
const { code, state, shop } = await request.json();
const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
  body: JSON.stringify({ client_id: shopifyClientId, client_secret: shopifyClientSecret, code })
});
```
The `.endsWith('.myshopify.com')` check exists only on `GET`, which performs no fetch. State validation never compares `stateData.shop` to the submitted `shop`. `POST {"shop":"169.254.169.254", ...}` sends the client secret to an attacker-named host; a crafted `{"access_token":...}` response is persisted via `upsert`, making it **persistent** SSRF driving the six unvalidated fetches in `shopify-api.ts`.

### 9. Real `JWT_SECRET` committed to git history **[verified]**
`.env.local.backup` was added in `f88308c` (2025-09-01, commit message: *"1. Hardcoded Secrets & Weak Fallbacks"*) and later deleted — still retrievable. Contains a real 43-char `JWT_SECRET`. `DATABASE_URL` in the same file points at localhost (low risk). **Rotate `JWT_SECRET` now**; if it matches production, anyone with repo access can forge tokens for any user in any tenant.

Compounding: `jwt-config.ts:17,27,76,89` hardcodes `'scan2ship-saas-fallback-jwt-secret-for-build-time-only-64-chars'`, reachable when `NODE_ENV === 'development'` **or** `NEXT_PHASE === 'phase-production-build'`, and it is in `getAllSecrets()` — the *accepted verification* set, not just signing.

### 10. Wrong delivery statuses written to wrong orders **[verified]**
`orders/refresh-statuses/route.ts` — two independent bugs in one loop:
- **No tenant filter** (`:33`): `findMany({ where: { id: { in: orderIds } } })`. Any authenticated user posts arbitrary order IDs, loads victim tenants' `delhiveryApiKey` into the handler, and writes tracking state onto their orders.
- **Positional zip.** `delhivery-tracking.ts:154-223` builds `results` by iterating Delhivery's response and `continue`-ing past malformed entries, so the array shrinks and reorders. `:120-124` then zips by index. `processedResult.data.tracking_id` is available and never used to match. Customers are told undelivered parcels were delivered.
- **Batch index bug.** `:110` slices `batch` by `i * batchSize`, but the writer loop re-indexes `clientOrders[j]` from `0` every batch. With >50 orders, batch 2's results overwrite orders 0–49.

---

## HIGH

### Data layer
- **`orders` has zero indexes.** No `@@index` in the model, none in any migration. `clientId`, `created_at`, `tracking_id`, `reference_number` all unindexed — every list and report is a seq scan + external sort. `credit_transactions.orderId` (`ON DELETE SET NULL`) is unindexed too, so every order delete full-scans it. Twelve models have no index at all. Minimum: `@@index([clientId, created_at(sort: Desc)])`.
- **16 `PrismaClient` instances** across route modules, each its own pool; `prisma.ts:127` only populates the global singleton when `NODE_ENV !== 'production'`, so the guard is inert on Vercel. Two construct **per invocation** — `pickup-location-config.ts:167` sits on the hot path of every order create. No `connection_limit`/`pgbouncer`/`DIRECT_URL` anywhere. This is the likely source of the transient DB failures that findings 6 and 10 convert into lost waybills.
- **Money as `Float`** throughout (`package_value`, `cod_amount`, `baseRate`, `ratePerKg`, `client_credit_costs.cost`). Should be `Decimal @db.Decimal(12,2)`.
- **`ON DELETE CASCADE` on 30 of 34 FKs** — deleting one `clients` row erases that tenant's entire order history *and* its complete credit ledger.

### Correctness
- **Waybill orphans.** `orders/route.ts:203` buys the waybill, `:248` creates the row — no transaction, no compensating `cancelOrder`. If the insert fails, a live billable waybill exists with no DB record.
- **COD with empty amount.** `cod_amount` is not in `requiredFields` (`orders/route.ts:62`) and there's no `is_cod → cod_amount` cross-check. `delhivery.ts:209` ships `cod_amount: ''`. Also `is_cod` is never boolean-coerced, so JSON `"is_cod":"false"` is truthy → a prepaid order manifests as COD and the customer pays twice.
- **`parseInt` on a UUID.** `orders/[id]/route.ts:265` does `parseInt(order.clientId)` on a UUID → `NaN` → falsy → the tenant filter in `getDelhiveryApiKey` is silently dropped, returning **another tenant's carrier key**. `delhivery.ts:365` and `:395` call it with no `clientId` at all. `pickup-location-config.ts:179` fails open by design (`if (clientId)` … `else console.warn`). A prior audit (`docs/audits/AUDIT_SUMMARY.md`) claimed this fixed; it patched one caller, not the root cause.
- **`ReferenceError` in a catch block.** `retry-delhivery/route.ts:38` declares `const orderId` inside `try`; the catch uses it at `:182`. Any error throws a second, uncaught error, so failure bookkeeping never runs.
- **Delhivery pincode validation has never run.** `validate-pincode/route.ts:50` calls `validatePincode(pincode)` but the signature is `(pincode, pickupLocation?)`, and `delhivery.ts:390` throws when `pickupLocation` is absent. Every request silently falls back to a static list — live serviceability is never checked.
- **No timeouts** on Delhivery order creation, OpenAI, or any of the six Shopify fetches. `timeout-config.ts` implements `fetchWithTimeout` — **zero call sites**. `delhivery.ts:120` retries *every* error including non-retryable 4xx, multiplying a hang 3×.
- **Outbound webhooks are a no-op.** `webhook-service.ts:28-35` returns `[]` unconditionally before any query. The UI creates, lists and "retries" webhooks that are never sent.
- **Per-client credit pricing is never applied.** `deductCreditsForFeature` is the only reader of `client_credit_costs` and has **zero callers**. Admins configure per-client rates; billing uses the hardcoded `CREDIT_COSTS` constants. Silent revenue loss on every non-default client.

### Security hygiene
- **Carrier API keys logged in plaintext** — `delhivery.ts:95-97` (`'Raw API Key:', apiKey`), `delhivery/update-order/route.ts:59`, `pickup-location-config.ts:212`. Live per-tenant production credentials in host logs.
- **Full request headers dumped**, including the session JWT — `orders/[id]/route.ts:108-112` masks the token at `:97` then dumps it verbatim at `:112`. `logger.ts:95` implements correct redaction; every offender uses raw `console.log`.
- **Rate limiting bypassable.** `persistent-rate-limiter.ts:43` keys the bucket on the client-controlled `X-Forwarded-For` with no trusted-proxy parsing → unlimited credential stuffing. It also **fails open** on error (`:162`) and is disabled whenever `NODE_ENV !== 'production'` — and `deploy-qa.sh:6` exports `NODE_ENV=development`.
- **Security headers never ship.** `applySecurityMiddleware` mutates a throwaway `new NextResponse()` and returns `null`; handlers return a different response. The CSP, HSTS, Referrer-Policy and Permissions-Policy at `security-middleware.ts:302-357` reach no client. Only three headers ship, from `next.config.ts:30-48`. **No CSP, no HSTS in production.**
- **Logo upload → stored XSS.** `logo/route.ts:272-274` takes the extension from the client filename with no allowlist and validates only the client-supplied `file.type`. Upload `filename="x.html"` with `Content-Type: image/png` → served from the app origin as HTML. (Path traversal was tested and is *not* exploitable — `split('.').pop()` discards it.)
- **No CSRF anywhere.** `csrf-protection.ts` is complete and imported by nothing, while `corsConfig` sets `credentials: true`.
- **No token revocation.** `getAuthenticatedUser` never consults `prisma.sessions`; there is no logout route among the 87. A stolen JWT stays valid its full 8h through password change and deactivation.
- **~1,900 lines of dead security code** — `input-sanitizer`, `file-upload-security`, `secure-error-handler`, `response-validator`, `timeout-config`, `session-manager`, `csrf-protection` are written and never reached. They provide false assurance in review.

### Frontend
- **Double-click creates two orders and two charges.** `OrderForm.tsx` guards on `isProcessing`, but `setIsProcessing(true)` isn't reached until `:844` — after three awaits in `handleSubmit`. The button stays enabled throughout.
- **JWT in `localStorage`** (`AuthContext.tsx:145`), attached manually in ~29 places in `settings/page.tsx` alone, bypassing the only 401 handler in `api-client.ts`. Token logged to console at `settings/page.tsx:1889`.
- **Admin pages are client-gated only.** No `middleware.ts`, `admin/layout.tsx` has zero auth. `return null` is used where a redirect is intended, so the full admin bundle ships to any visitor. Two incompatible role vocabularies (`'admin'` vs `'client_admin'|'super_admin'`) mean `admin/page.tsx:17` and `admin/credits/page.tsx:99` disagree about who may enter.
- **Delhivery API key rendered in plaintext** at `admin/settings/clients/[id]/page.tsx:1034` (the edit input for the same field uses `type="password"`).
- **`exceljs` statically imported into a client component** (`OrderList.tsx:7`) — ~940 KB shipped to everyone loading the orders list, used only in the export handler.
- **Auto-refresh destroys in-progress form data** — `OrderForm.tsx:228-272` resets five fields to client defaults every 5 minutes mid-order.
- **Zero `AbortController`** in the entire frontend; no modal has `role="dialog"` or a focus trap.
- **Config caches are not cleared on logout** — tenant A's order-config and courier list are served to tenant B for up to 5 minutes after re-login on a shared browser.

---

## MEDIUM / systemic

**Build gates are all broken, and there is no CI.**

| Gate | Advertised | Actual |
|---|---|---|
| TypeScript | suppressed (`next.config.ts:4-6`) | **323 errors**, 66 files (190 in shipping code) |
| ESLint | suppressed (`next.config.ts:7-9`) | **crashes** — `eslint.config.mjs:16` declares `@typescript-eslint/*` rules with no `plugins` key |
| Jest | 8 `test:*` scripts | **11/11 suites fail, 0 tests run** — `@next/swc-darwin-arm64` binary missing, pinned 15.5.7 vs next 15.5.9 |
| CI | — | **no `.github/` at all** |

Several CRITICAL findings are errors the compiler already flags: `UserRole.ADMIN` (finding 2), the `retry-delhivery` `ReferenceError`, `test-admin`'s missing import, and `sessions.token` (a column that doesn't exist). Vercel builds with both checks off, so **the only gate between a commit and production is whether webpack emits a bundle.**

Other systemic items:
- **`scripts/` is gitignored** (`.gitignore:83`) — 23 of 40 npm scripts reference files that don't exist. `npm start` is broken for everyone (`prestart` runs two missing validators), and `db:migrate:deploy` chains a `db:backup` that fails, so the "safe migration" guarantee in `prisma/migrate-protection.md` is fiction.
- **34 npm vulnerabilities** (24 high). Highest ROI in this report: `next` 15.5.9 → 15.5.23 is non-breaking and closes ~26 advisories including an App Router middleware-bypass. Also `jws` (improper HMAC verification) sits directly under the login path.
- **9 unused production deps** — `cors`, `mysql2`, `pg`, `express-rate-limit`, `limiter`, `lodash`, `node-fetch`, `pdfkit`, `tesseract.js`. Both `bcrypt` and `bcryptjs` are installed; `password-policy.ts:283` hashes with **scrypt** while `auth/login:97` compares with **bcrypt**, so any password changed via `auth/change-password` locks the user out permanently.
- **Dead code shipped as live routes** — `orders/[id]/shipping-label/route.ts` is 336 lines entirely inside a comment block; `process-image` and `process-text` return hardcoded fake data (`'John Doe'`, `'123 Main Street'`) and **charge credits for it**; `route-new.ts` and `route-backup.ts` are stale near-duplicates.
- **Hardcoded production values in shared paths** — `'www.vanithafashionjewelry.com'` as the Shopify fallback domain (`fulfill:163`, `shopify/webhooks:1025`), and a hardcoded client UUID at `shopify/webhooks:812` that attributes every tenant's tracking webhook to one client.
- **`vercel.json`**: `installCommand: "npm install"` (not `ci` — likely how the SWC version skew happened); no `regions` so an India-focused app defaults to US-East; duplicates all four `Cache-Control` rules already in `next.config.ts`; sets the Prisma-4-era `PRISMA_GENERATE_DATAPROXY`.
- **312 MB of production DB dumps** in `backups/` — correctly gitignored, but unencrypted multi-tenant PII on a laptop.

---

## Recommended order of work

**Stop the bleeding (hours, not days):**
1. Delete or authenticate the 13 unauthenticated routes — start with `auth/register-user`, `orders/[id]/fulfill`, `delhivery/update-order`, `admin/fix-database`. Restore the commented-out `authorizeSuperAdmin` calls in `cross-app-mappings`.
2. Rotate `JWT_SECRET` (exposed in `f88308c`).
3. Fix `UserRole.ADMIN` — add the enum member or replace all usages with a real role.
4. Replace `data: body` in `orders/[id]` PUT with an explicit field allowlist; add `clientId` to its `where`.
5. Gate `credits/verify-payment` behind actual gateway verification.

**Then (days):**
6. `npm i next@15.5.23 && npm audit fix`.
7. Add `clientId` to every `where` in `orders/[id]`, `retry-delhivery`, `refresh-statuses`, `courier-services` PUT, and the `admin/credits/*` and `admin/settings/clients/*` handlers.
8. Make all credit mutations atomic — conditional `decrement`, wrapped in `$transaction` with the order write, and stop swallowing deduction failures.
9. Add indexes to `orders` and `credit_transactions.orderId`; collapse to one `PrismaClient` with `connection_limit`/`pgbouncer`.
10. Match tracking results to orders **by AWB**, not by array index.
11. Move `securityHeaders()` into a root `src/middleware.ts` so CSP/HSTS actually ship, and add server-side page protection there.
12. Strip every credential and header `console.log`.

**Then (structural):**
13. Repair Jest, fix `eslint.config.mjs`, add a CI workflow running `tsc --noEmit` + `eslint` + `jest --ci`, with the TS error count as a ratchet that may only decrease.
14. Adopt `zod` at the route boundary — it collapses the mass-assignment, unvalidated-role, wildcard-permission and malformed-JSON classes into one pattern.
15. Turn off `ignoreBuildErrors` / `ignoreDuringBuilds` once the count reaches zero. Delete the ~1,900 lines of dead security modules, or wire them up.
