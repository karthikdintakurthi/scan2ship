# Scan2Ship MCP branch re-audit

Reviewed: 2026-09-29 · Branch: `feature/mcp-implementation` · HEAD: `3d13739`

Compared with the original audited commit, `6c639f6`. This report is the current source baseline for this chat and supersedes the original report's description of what is implemented. Historical deployment notes remain historical evidence, not a fresh production verification.

## Assessment

The branch now contains a substantial customer MCP implementation and fixes many original application vulnerabilities. It has shared application services, self-hosted OAuth, scoped tools, operational previews, session enforcement, and passing local quality checks. Planning should build on these components rather than recreate them.

There are still actionable privacy, authorization, OAuth concurrency, and carrier-failure defects. Resolve the P1 findings below before broadening customer access or enabling unattended WhatsApp shipment creation. Existing tests are materially better, but do not establish that these boundaries are correct.

No application fixes, database operations, carrier calls, beta requests, deployments, or credential changes were performed in this review. Only audit documentation was changed.

## 1. Current architecture and product scope

### Implemented

- **Customer MCP:** `/api/mcp`, stateless Streamable HTTP with JSON responses, using `@modelcontextprotocol/sdk` v1 (`^1.31.0` in the manifest) and Zod `^3.25.76`. This differs from the v2 proposal in the original plan; it is the actual implemented stack.
- **OAuth:** authorization metadata, protected-resource discovery, dynamic public-client registration, PKCE S256, consent page, hashed authorization/refresh tokens, 15-minute access tokens, refresh rotation, and connection revocation.
- **Identity boundaries:** a grant fixes tenant and user; MCP calls recheck grant revocation, active user/tenant, tenant allowlist, and the current role's allowed scopes. Customer PII, labels, shipments, and pickups require optional consent scopes.
- **Shared services:** order creation, pickup booking, live tracking, scoped order reads, shipping estimates, account context, labels, credits, and DTDC slip claiming.
- **Writes:** persistent 15-minute previews and `shipment_operations`, atomic preview claims, repeat-call replay, a shipment daily cap, and `MCP_WRITES_ENABLED`. Booking runs within the request; no durable worker/outbox was implemented.
- **Website sessions:** login and refresh share signing logic; access tokens need an active session row; logout and password changes can revoke sessions. Multiple devices are supported.
- **Billing:** conditional credit debits and ledger updates share a transaction; recharge submission is pending until platform-admin approval. Carrier failure compensation exists, with limitations described below.
- **Operations:** middleware supports full/read-only maintenance from Vercel Global Config with an environment fallback and an operator bypass. MCP honors read-only mode for write tools.
- **Release checks:** TypeScript and lint errors fail builds, CI is present, npm start no longer points at missing prestart scripts, and backup/migration scripts are tracked.

### Removed

- Shopify integration routes and client library; history says Shopify moved to `scan2ship-b2b`.
- Catalog proxy, mapping administration, product picker, and inventory side effects.
- Partner API, carrier-rate API, API-key management routes, and API-key authentication.
- Unused System Configuration administration and several public debug/repair endpoints.

Some historical tables/columns remain in Prisma, including `api_keys`, `cross_app_mappings`, `system_config`, and Shopify-related data. Code removal does not prove data or secrets were removed from every database.

### Actual MCP tool catalog

| Group | Tools |
|---|---|
| Account and rates | `get_account_context`, `list_shipping_options`, `quote_shipping`, `get_credit_balance` |
| Orders and tracking | `search_orders`, `get_order`, `get_tracking_status`, `track_shipment_live` |
| Optional customer data | `get_customer_order_history`, `get_shipping_label` |
| Shipment operations | `prepare_shipment`, `create_shipment`, `get_shipment_operation` |
| Pickup operations | `prepare_pickup`, `schedule_pickup` |

There are **15 tools**, ten reads/downloads and five write-related tools including operation status. Tool discovery is restricted by scope. The write switch currently hides operation status too.

Delhivery bookings contact the carrier. DTDC uses the account's slip pools, now claimed server-side by both website and MCP. India Post and other manual couriers can accept a supplied tracking number. Shipping quotes are configured estimates. Labels are printable HTML behind signed links that expire after ten minutes and recheck grant/resource access.

## 2. Verification performed

| Check | Current result |
|---|---|
| `npm run typecheck` | Pass; zero reported TypeScript errors |
| `npm run lint:ci` | Pass; zero errors, **272 warnings**, exactly the configured ceiling |
| `env -u S2S_SESSION_DATABASE_URL npm run test:ci` | **42 suites pass; 952 tests pass; 4 suites/13 tests skipped** |
| Database integration tests | Deliberately not run against an unknown database; require a disposable isolated PostgreSQL database |
| Production build | Not run; the build path can apply migrations depending on environment |
| Source inventory | 73 API route files, 3 well-known discovery routes, 35 Prisma models, 41 migrations |
| Focused boundary probes | Executed current TypeScript functions with synthetic database/provider doubles; results below |

The probes transpiled the current files without modifying them. The OAuth probes exercise concurrent reads with deterministic doubles; they are evidence of the source race, not a live PostgreSQL concurrency test. The Origin probe used the installed SDK transport directly. No probe used real customer data, tokens, or network requests.

Recorded probe results:

```text
Allowed order 7 has OWN-AWB; supplied DIFFERENT-AWB was sent to the carrier double.
orders:read result: mobile ******0001, referenceNumber 9000000001 (synthetic number).
Same authorization code: two concurrent exchanges both succeeded.
Same refresh token: two concurrent rotations both succeeded.
Carrier accepted pickup; database save threw; service returned status failed.
Configured SDK transport accepted Origin https://untrusted.test with HTTP 200.
```

The repository reports successful beta discovery, tenant-isolation checks, connection and revocation, and Claude/Claude Code acceptance. I did not repeat those live checks. Its token expiry/refresh client acceptance is still marked pending in [MCP_READ_PILOT.md](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/docs/MCP_READ_PILOT.md).

## 3. Remaining findings, in priority order

### P1 — Live tracking can use an authorized order to query a different waybill

[live-tracking.ts:104](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/live-tracking.ts:104) authorizes by `orderId` when one is supplied. At [line 117](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/live-tracking.ts:117), it nevertheless prefers the separately supplied `waybill` for the carrier request. The MCP schema permits both inputs together.

**Trigger:** call `track_shipment_live` with an accessible order ID and another tracking number. The service uses credentials belonging to the accessible order but requests the other number. The exact carrier data exposure depends on what that carrier key can retrieve; Scan2Ship's order authorization is bypassed for the supplied AWB regardless. This also bypasses child-user order restrictions within a shared carrier account.

**Fix:** derive the AWB from the authorized order. Reject conflicting input or require exactly one lookup field. Check that the provider's returned AWB matches the requested AWB. Add a test combining an allowed order with an inaccessible waybill; testing each input separately misses this case.

**Evidence:** reproduced locally with synthetic order/provider doubles.

### P1 — The customer-phone scope is bypassed by reference numbers

[orders.ts:104](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/orders.ts:104) returns raw `reference_number` through basic order reads. [reference-number.ts:32](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/reference-number.ts:32) embeds the full customer mobile in generated references; with the prefix disabled the reference is the mobile itself. Custom references also append it.

**Trigger:** a connection with `orders:read` but without `customers:read` searches or opens an order. The dedicated mobile field is masked, but the reference exposes the same complete number.

**Fix:** use a separate non-PII display reference for limited-scope results, or redact the phone-derived portion consistently in list/detail/tool summaries. Inventory existing reference formats before changing them; preserve carrier reconciliation identifiers internally.

**Evidence:** reproduced with a synthetic phone and the real reference helper plus order-detail mapping.

### P1 — Authorization-code consumption and refresh rotation are not atomic

[oauth.ts:157](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/mcp/oauth.ts:157) reads a code, checks `consumedAt`, and later updates it by ID unconditionally. Two requests can both read it as unused and issue token pairs. [Refresh rotation at line 185](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/mcp/oauth.ts:185) similarly issues a successor before revoking the old token, allowing multiple successors from concurrent use.

**Impact:** sequential replay checks pass while concurrent replay defeats one-time semantics and can create multiple live refresh branches. Possession of the code plus verifier, or the refresh token, is still required; this is not an unauthenticated login bypass.

**Fix:** claim the unconsumed/unrevoked record conditionally within a transaction, check the affected-row count, and create the successor in the same transaction. Define legitimate concurrent-refresh behavior and token-family revocation explicitly. Cover code replay, refresh replay, transaction rollback, and grant-revocation races using real PostgreSQL.

**Evidence:** both exchanges and both rotations succeeded in deterministic concurrent probes of the current functions.

### P1 — Ambiguous carrier outcomes can be reported as ordinary failures

**Pickups:** [pickups.ts:133](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/pickups.ts:133) receives carrier success and then saves the local request. Its catch at line 159 classifies a database error or network exception as `failed`, omitting the carrier ID. [pickup-operations.ts:197](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/pickup-operations.ts:197) therefore records `failed` or `partially_succeeded`; its outer reconciliation catch never sees these swallowed exceptions.

**Shipments:** [order-creation.ts](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/order-creation.ts:225) refunds on a carrier failure result or thrown exception. [Delhivery request handling](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/delhivery.ts:116) retries all thrown failures, including ambiguous POST results, without a request timeout. [shipments.ts:304](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/shipments.ts:304) treats a failed result without `orderId` as an ordinary failure and can report `creditsRefunded: true` even though the refund helper only logs refund failures.

**Impact:** the same preview is protected from duplicate execution, but a merchant or assistant may prepare a new preview after a misleading failure. A real carrier booking may already exist. Current synchronous execution also leaves a crash window between charging, booking, saving, and recording the operation result.

**Fix:** distinguish definitive rejection from unknown outcome. Persist operation/provider/ledger references, retain per-location accepted pickup IDs, expose `reconciliation_required`, and record actual refund status. Use bounded timeouts and retry only operations whose provider semantics support it. The branch deliberately chose synchronous execution; that choice still needs reliable reconciliation and fault-injection tests. Durable workers remain a useful later improvement.

**Evidence:** pickup accepted/save-failed case reproduced. Shipment behavior verified from source; no live booking or crash test performed.

### P1 — Shipment commit does not recheck permitted pickup or courier state

`prepareShipment` checks permitted pickups and active couriers. After a preview is saved, [createShipment](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/shipments.ts:269) forwards the saved payload to `createOrder`. [createOrder](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/application/order-creation.ts:64) validates required fields/phone and resolves carrier credentials by tenant; it does not enforce the actor's current pickup assignments or courier availability.

**Trigger:** a child user prepares a shipment, an admin removes their pickup assignment, then the user commits within the 15-minute preview lifetime. The refreshed principal still has `shipments:create`, and the old pickup can be booked. A disabled courier or changed configuration has the same stale-preview problem. Website order creation also relies on the caller/UI for these resource restrictions.

**Fix:** enforce current action, pickup, courier, and value constraints inside the shared execution service before charging or booking. Invalidate previews whose material details change. Retain API-level checks as additional protection, not as a substitute for service authorization.

**Evidence:** source review; the existing shipment tests mock `createOrder` and do not test assignment changes between preview and commit.

### P2 — MCP Origin validation is absent

[MCP route transport options](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/app/api/mcp/route.ts:33) do not enable the installed SDK's Origin protections. [mcp/http.ts](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/mcp/http.ts:3) reflects arbitrary origins in CORS; its guard checks host, not origin. The installed transport defaults `enableDnsRebindingProtection` to false.

**Fix:** define allowed browser origins and reject unexpected present Origin headers before transport handling. Allow legitimate non-browser clients without Origin. Only trust forwarded host headers under a defined proxy boundary. Add route-level allowed/disallowed-origin tests. Bearer authentication still applies; the probe does not demonstrate unauthenticated data access.

**Evidence:** the configured SDK transport accepted a synthetic untrusted Origin during initialization.

## 4. Original findings: what changed

| Original issue | Current source assessment |
|---|---|
| Public role/tenant injection on registration | Fixed with authenticated admin creation and role/tenant provisioning rules |
| Platform-admin role constant mistakes | Fixed; unknown required roles now fail closed |
| Order detail tenant gaps and mass assignment | Shared order-access policy and field allowlists added |
| Public repair/debug routes | Relevant unused routes removed |
| Integration credentials in read responses/raw header logs | Targeted DTO/logging fixes implemented; full order/address logging still exists |
| Public mapping credential exposure | Mapping API and entire Catalog integration removed |
| Self-approved credit top-ups | Replaced with pending recharge requests and admin approval |
| Concurrent credit balance loss | Conditional mutations and transactional ledger updates implemented |
| Arbitrary tenant carrier-key lookup | Mandatory string tenant parameter and shared Prisma lookup implemented |
| Positional tracking refresh | Tenant/order scoping and AWB matching implemented; new live dual-input issue remains |
| Public tracking exposes addresses/order values | Output minimized/masked and rate-limited; remains a phone-based public lookup without OTP on this branch |
| Shopify OAuth host issue | Shopify implementation removed from this application |
| Broken type/lint/test gates | Repaired; current local checks pass as recorded above |
| Outbound webhooks return no configured destinations | **Still unresolved:** `getActiveWebhooks` returns `[]` |

## 5. Product decisions and remaining operational gaps

These are distinct from the reproduced defects:

- **Confirmation is client-managed.** Branch history explicitly chooses chat confirmation and synchronous writes. The server accepts a preview ID; it does not hold independent proof of user approval. Tool descriptions/annotations do not guarantee every client prompts. For WhatsApp, bind the trusted sender's button/reply to the specific preview, account, and expiry before calling the commit service.
- **Idempotency is per preview.** Different previews for the same forwarded message can create separate orders. A WhatsApp ingress must uniquely claim its channel message ID and retain its draft/operation mapping.
- **Grant-specific operation isolation is incomplete.** Operations record `grantId`, but `findOwnOperation` and preview claiming restrict by tenant/user/channel rather than grant. Decide whether connections owned by the same user may share drafts. Scope checks remain necessary for each operation type.
- **Read-only maintenance is not a strict freeze.** All `/api/auth/*` writes remain allowed, including user registration/password changes; MCP status tools disappear with write tools. Global Config failure deliberately opens maintenance. Refine these if maintenance must guarantee no business/admin writes or continued reconciliation visibility.
- **Outbound notifications are unimplemented.** [webhook-service.ts:28](/Users/karthiknaidudintakurthi/Documents/GitHub/scan2ship/src/lib/webhook-service.ts:28) returns no active destinations. The inbound Delhivery webhook now authenticates and rejects ambiguous AWBs, but processes only shipped/dispatched/in-transit states. It is not a complete delivered/failed-delivery notification pipeline.
- **Entitlements and pricing need explicit policy.** MCP checks active flags and role but does not enforce subscription expiry. Shared order creation still uses the fixed `ORDER` credit cost; per-client configured pricing is not applied by that call.
- **Integration tests are opt-in.** CI has no PostgreSQL service or `S2S_SESSION_DATABASE_URL`, so those suites do not become mandatory merely because CI is green. Add an isolated database job for authorization and monetary concurrency tests.
- **Docs have drifted.** README and `.cursor/rules` still contain old claims about broken checks, removed integrations, public registration, missing middleware, and indexes. The original audit mixes old recommendations with newer status notes. Use this snapshot plus source over those stale descriptions.
- **Data cleanup/deployment remain separate.** Previous notes report beta copies of real data/keys and production schema/config drift. No current deployment or secret state was checked here; do not assume the branch, beta, and production are identical.

## 6. Updated WhatsApp implementation direction

The previous WhatsApp concept still fits, but much of its application foundation now exists.

**Reuse now:** shared `createOrder`, shipment/pickup previews, credit debit logic, role and tenant policy, DTDC slip claiming, live tracking, and label rendering. Reuse requires the execution-policy and failure-handling repairs above.

**Build next:** verified WhatsApp sender-to-user linking; signed webhook intake; unique inbound message records; per-draft conversation state; address extraction with missing-field questions; trusted reply/button confirmation; channel operation tracking; durable outgoing notifications and template/consent handling.

There is no partner API left to wrap. A WhatsApp backend in this application can call shared services through its own authenticated channel context. An external backend would need a deliberately supported internal API or appropriately delegated MCP access. Do not use a shared super-admin token or infer the tenant from forwarded message content. Shipment operations currently hardcode channel `mcp`; introduce channel-aware operation identity before reusing them for WhatsApp.

Recommended next work order:

1. Fix live lookup and phone-reference leakage; make OAuth consumption/rotation atomic.
2. Recheck resource permissions at commit and repair ambiguous booking/refund outcomes.
3. Add the missing boundary/fault-injection tests and a mandatory isolated PostgreSQL CI job; verify actual client refresh behavior.
4. Build WhatsApp text-address drafts and sender-bound confirmation with message-level deduplication.
5. Add reliable notifications, then screenshots, batch drafts, and additional automation.

## Context to carry forward

Scan2Ship on `feature/mcp-implementation` is a Next.js/Prisma logistics SaaS with a working MCP implementation, shared shipping services, custom OAuth and active-session website auth. It is no longer the original app with failing checks and Shopify/Catalog/partner integrations. Reads, labels, live Delhivery tracking, shipment creation, and pickups are implemented. Writes are preview-based, synchronous, opt-in and switch-controlled; customer confirmation is handled in chat. Local checks pass with 952 tests and 272 lint warnings; four database suites remain unexecuted in this review. OAuth replay races, reference-number PII, dual-input tracking authorization, stale preview permissions, and carrier outcome classification require work. WhatsApp linking, ingestion, message deduplication, and notification delivery are still to be built.

## Verification addendum (2026-09-29)

Each finding was checked against the source at `3d13739`, and against the beta database where data mattered. No application code was changed. Every P1 and the P2 are confirmed. Two findings are more serious than described above, and two statements in section 5 need context.

| Finding | Verdict | Additional evidence |
|---|---|---|
| Live tracking dual input | **Confirmed** | `getLiveTracking` authorizes by `orderId` when given, then uses `waybill \|\| order.delhivery_waybill_number \|\| order.tracking_id` for the Delhivery request, so a supplied waybill wins. |
| Customer phone in reference numbers | **Confirmed, wider than stated** | On beta, 180,000 of 180,139 orders (99.9%) have a reference containing the customer's 10-digit mobile, and 23,552 references are exactly the mobile. `get_order` and `search_orders` return `reference_number` unmasked without `customers:read`; `search_orders` also matches on it. |
| OAuth code and refresh races | **Confirmed** | Code exchange reads `consumedAt`, then updates by `id` unconditionally. Refresh rotation calls `issueTokens` (creating the successor) before an unconditional revoke. Sequential reuse is detected; concurrent use is not. The website refresh route already uses a conditional claim (`updateMany` on the current hash); the MCP code does not. |
| Ambiguous carrier outcomes | **Confirmed, more severe for shipments** | `DelhiveryService.makeRequest` retries **every** thrown error up to 3 times with backoff, including HTTP 4xx/5xx (`!response.ok` throws) and network errors, for the non-idempotent `POST /api/cmu/create.json`. One order can therefore create several real waybills. `fetch` has no timeout. `create_shipment` reports `creditsRefunded: true` for any 400 without checking the refund, which only logs failures. In `requestPickups`, one `try` covers the Delhivery call and the `pickup_requests` insert, so an accepted pickup whose local save fails is reported as `failed`, and its Delhivery ID is lost. |
| Stale preview permissions | **Confirmed** | `createOrder` never reads `user_pickup_locations`, `pickup_locations` access rules, or `courier_services`. Pickup assignment and courier status are checked only in `prepareShipment`, and on the website only by the form's options. |
| MCP Origin (P2) | **Confirmed** | The route builds `WebStandardStreamableHTTPServerTransport` with only `sessionIdGenerator` and `enableJsonResponse`. The installed SDK supports `allowedOrigins`/`allowedHosts`/`enableDnsRebindingProtection`, which are unused. `mcpCorsHeaders` reflects any `Origin`. A bearer token is still required. |
| Inventory statistics | **Confirmed** | 15 MCP tools; 73 API route files plus 3 discovery routes; 35 models; 41 migrations. |
| Webhook scope | **Confirmed** | The Delhivery webhook acts only on `shipped`, `dispatched`, and `in_transit`. |
| Docs drift | **Confirmed** | `README.md` still says build checks are disabled (323 errors, lint crash, 0 tests), that there is no `src/middleware.ts`, and that `UserRole.ADMIN` is misused. All three are now false. |

### Context for section 5

- **Subscription expiry is not enforced anywhere, not just in MCP.** `authorizeUser` supports `requireValidSubscription`, but no route uses it or `authorizeUserWithSubscription`. It is a product-policy gap across the whole app. No tenant on beta currently has an expired subscription.
- **Fixed order pricing predates this branch.** The original `POST /api/orders` (`6c639f6`) also used `CreditService.getCreditCost('ORDER')`. On beta, every tenant's configured `ORDER` cost in `client_credit_costs` is 1, the same as the fixed cost, so today there is no billing mismatch. Moving to per-client costs is a policy change, not a regression.

### Suggested fix order (unchanged, with one addition)

1. Stop retrying the Delhivery create `POST` on ambiguous failures, and add request timeouts. This is the only issue that can create duplicate real shipments.
2. Live-tracking waybill binding, reference-number masking without `customers:read`, and atomic OAuth code consumption and refresh rotation.
3. Commit-time pickup/courier/role checks inside the shared service; outcome classification (`reconciliation_required`, refund status, per-location pickup IDs).
4. MCP Origin validation.
