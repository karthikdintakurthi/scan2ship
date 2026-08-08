# Scan2Ship

Multi-tenant logistics / shipping SaaS. Merchants create orders, generate courier waybills and labels, track shipments, and pay per order from a credit balance. Integrates with Delhivery (API), DTDC (manual slip management), Shopify, and an external Catalog app.

- **Stack:** Next.js 15 (App Router) · TypeScript · Prisma 6 · PostgreSQL · Tailwind · deployed on Vercel
- **Scale:** ~62k LOC, 87 API routes, 27 Prisma models

---

## ⚠️ Before you start

Two things will surprise you, so they are stated up front rather than discovered:

1. **Build-time checks are disabled.** `next.config.ts` sets `typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`. The codebase currently has **323 TypeScript errors**, `npm run lint` **crashes** on a malformed `eslint.config.mjs`, and `npm test` runs **0 tests** (the `@next/swc-darwin-arm64` binary is missing/version-skewed). There is no CI. A green deploy means only that webpack emitted a bundle.
2. **`scripts/` is gitignored** (`.gitignore:83`). **22 of the 40 npm scripts point at files that are not in the repo**, including `prestart` — so **`npm start` does not work**. Use `npm run dev` locally. See "npm scripts" below for what actually runs.

There is a known-issues register at [`docs/audits/FULL_APP_AUDIT_2026-08-08.md`](docs/audits/FULL_APP_AUDIT_2026-08-08.md), including unauthenticated endpoints and credit-system race conditions. **Read it before working on auth, billing, or the Delhivery integration.**

---

## Getting started

```bash
npm install          # postinstall runs `prisma generate`
cp env-template.env .env.local
# fill in DATABASE_URL and JWT_SECRET (see below), then:
npx prisma migrate deploy
npm run dev          # http://localhost:3000
```

`npm run build` works. `npm start` does not (broken `prestart`) — run `next start` directly if you need a production server locally.

### Required environment variables

Only two are hard-required; the app throws at startup without them.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | **Minimum 32 characters.** `src/lib/jwt-config.ts:19-45` throws if absent, too short, or a known-weak value |

Feature-gated — omit them and the corresponding feature is unavailable:

| Feature | Variables |
|---|---|
| AI address parsing | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Shopify | `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`, `SHOPIFY_WEBHOOK_SECRET`, `SHOPIFY_SHOP_NAME`, `SHOPIFY_API_VERSION`, `SHOPIFY_ADMIN_ACCESS_TOKEN` |
| Delhivery | `DELHIVERY_BASE_URL`, `DELHIVERY_WEBHOOK_SECRET` (per-tenant API keys live in the `pickup_locations` table, not env) |
| Catalog app | `CATALOG_APP_URL` |
| Payments UI | `NEXT_PUBLIC_UPI_ID`, `NEXT_PUBLIC_PAYEE_NAME` |

> **`env-template.env` is incomplete.** 18 variables read by the code are absent from it — notably `ALLOWED_ORIGINS`, the nine `DB_POOL_*`/`DB_*` tuning vars, and the four `*_TIMEOUT` vars. It also lists 8 variables nothing reads (`MAX_FILE_SIZE`, `ALLOWED_FILE_TYPES`, `RATE_LIMIT_WINDOW`, `RATE_LIMIT_MAX_REQUESTS`, `LOG_FILE_PATH`, `NEXT_PUBLIC_CATALOG_APP_URL`, `SHOPIFY_APP_URL`, `NEXT_TELEMETRY_DISABLED`) — setting those has no effect.

---

## Architecture

```
src/
├── app/
│   ├── api/          87 route handlers — each authenticates itself
│   │                 (there is NO src/middleware.ts; no edge-level protection)
│   ├── admin/        platform + tenant admin UI
│   ├── orders/  view-orders/  settings/  reports/  credits/  tracking/
├── components/       OrderForm, OrderList (2,955 lines), modals
├── contexts/         AuthContext — JWT stored in localStorage
├── lib/              integrations, auth, credits, label generators
└── hooks/
prisma/schema.prisma  27 models, 34 migrations
```

**Multi-tenancy.** Every tenant is a `clients` row; almost every table carries `clientId`. Isolation is enforced **per query, by hand** — there is no Prisma middleware or RLS enforcing it. Any new query against a tenant-scoped table must include `clientId` in its `where`. Several existing handlers do not; see the audit.

**Auth.** JWT bearer tokens (`src/lib/auth-middleware.ts`), plus API-key auth for the external/partner API (`src/lib/api-key-auth.ts`). Roles, ascending: `child_user` → `user` → `client_admin` → `super_admin` → `master_admin`. Note `UserRole.ADMIN` appears in several routes but **is not a member of the enum**.

**Credits.** One credit per order by default (`CREDIT_COSTS` in `src/lib/credit-service.ts`). Balances live in `client_credits`, with a `credit_transactions` ledger.

---

## npm scripts

Working:

```bash
npm run dev            # dev server
npm run build          # prisma generate + next build
npm run db:studio      # Prisma Studio
npm run db:status      # migration status
npm run db:generate    # prisma generate
npm run db:push        # push schema (dev only)
```

**Broken — the referenced files are not in the repo:**
`prestart` (so `npm start`), `build:local`, `db:backup`, `db:migrate:safe`, `db:copy-prod`, `db:migrate-prod-to-local`, `db:sync-versions`, `db:add-a5-to-prod`, `test:api:all`, `coverage:audit`, `setup-db`, `seed`, `db:seed`, `setup-railway`, `railway`, `validate-env`, `validate-security`, `migrate:prod-to-qa{,-prisma,-direct,-corrected}`, `fix:sequences`.

**Broken by chaining:** `db:migrate:dev` and `db:migrate:deploy` both run `npm run db:backup` first, which fails — so the migration never runs and **no backup is taken**. Call `npx prisma migrate deploy` directly and back up manually.

**Dangerous:** `db:reset` drops and recreates the database against whatever `DATABASE_URL` is in the environment. See [`prisma/migrate-protection.md`](prisma/migrate-protection.md).

---

## Database migrations

Read [`prisma/migrate-protection.md`](prisma/migrate-protection.md) first. Summary: back up manually with `pg_dump`, test on a copy, then `npx prisma migrate deploy`. Note that 30 of 34 foreign keys are `ON DELETE CASCADE` — deleting one `clients` row erases that tenant's orders *and* credit ledger.

---

## Testing

The suite does not currently run — all 11 Jest suites fail to load with a missing `@next/swc-darwin-arm64` binary (pinned 15.5.7 against `next` 15.5.9). To attempt a repair:

```bash
rm -rf node_modules package-lock.json && npm install
npx jest --ci
```

Coverage is near zero regardless: 12 test files against 87 API routes.

---

## Documentation

| Document | Covers |
|---|---|
| [`docs/audits/FULL_APP_AUDIT_2026-08-08.md`](docs/audits/FULL_APP_AUDIT_2026-08-08.md) | Full audit: security, data layer, correctness, frontend, build |
| [`docs/audits/AUDIT_SUMMARY.md`](docs/audits/AUDIT_SUMMARY.md) | Delhivery API-key isolation — **partially resolved**, see its banner |
| [`docs/audits/AUDIT_DELHIVERY_RETRY_FLOW.md`](docs/audits/AUDIT_DELHIVERY_RETRY_FLOW.md) | Detailed retry-flow analysis (historical) |
| [`docs/audits/DELHIVERY_SANITIZATION_SUMMARY.md`](docs/audits/DELHIVERY_SANITIZATION_SUMMARY.md) | Field sanitization before Delhivery calls |
| [`docs/integrations/DTDC_AUDIT_REPORT.md`](docs/integrations/DTDC_AUDIT_REPORT.md) | DTDC: partial implementation, no API integration |
| [`docs/integrations/DTDC_VARIANTS_IMPLEMENTATION.md`](docs/integrations/DTDC_VARIANTS_IMPLEMENTATION.md) | DTDC / DTDC COD / DTDC Plus slip management |
| [`docs/DEPLOY_USER_CUSTOM_FROM_ADDRESS_MIGRATION.md`](docs/DEPLOY_USER_CUSTOM_FROM_ADDRESS_MIGRATION.md) | One specific migration runbook |
| [`docs/api/Scan2Ship_API_Collection.postman_collection.json`](docs/api/Scan2Ship_API_Collection.postman_collection.json) | Postman collection — all 133 handlers across all 87 routes, generated from source |

---

### API reference

Import [`docs/api/Scan2Ship_API_Collection.postman_collection.json`](docs/api/Scan2Ship_API_Collection.postman_collection.json) into Postman. It covers all 133 handlers across the 87 route files, grouped into 18 folders. Every request records its required auth and minimum role, and links to the source file it was derived from.

Set `base_url`, then run **Authentication → Create Auth / Login** — its test script stores `auth_token` and `client_id` for you. Set `api_key` for the External API folder.

Auth breakdown across the surface: **101** JWT-protected, **4** API-key, **1** HMAC (Shopify webhook), **27** with no authentication. Some of those 27 are public by design (login, registration, PWA manifest); the rest are gaps documented in the audit and are marked ⚠️ in their request descriptions.

## Deployment

Vercel, configured by `vercel.json`: 30s function timeout for `/api/**`, plus cache headers duplicated from `next.config.ts`. Builds run `npm install` (not `npm ci`), so transitive versions can drift from the lockfile. No region is set, so functions default to US-East despite this being an India-focused application.
