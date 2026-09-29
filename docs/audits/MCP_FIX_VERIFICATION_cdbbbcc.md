# MCP fix verification — cdbbbcc

Reviewed `feature/mcp-implementation`, comparing `3d13739..cdbbbcc`.

## Verdict

The fixes address the original tracking lookup, OAuth race, browser Origin, booking retry, and pickup persistence cases. MCP confirmation now rechecks pickup access and active couriers. Four gaps remain before the earlier findings can all be closed.

This review changes no application code. The existing modification to `MCP_READINESS_AND_IMPLEMENTATION_PLAN_2026-09-29.md` was preserved.

## Checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint:ci` | Passed: zero errors, 272 warnings |
| `env -u S2S_SESSION_DATABASE_URL npm run test:ci` | 45 suites passed; 999 tests passed; 4 suites / 13 tests skipped |
| Independent synthetic fault probes | Confirmed the tracking and pickup fixes and reproduced the remaining cases below |

The probes load the actual TypeScript services with mocked database/carrier dependencies. They make no network calls or real bookings. OAuth concurrency coverage uses the new in-memory conditional-write tests; PostgreSQL concurrency, real OAuth client connections, and live carrier behavior were not exercised. The database integration suites still need an isolated test database.

## Fixes verified

- **Live tracking:** an order ID paired with another waybill returns 400 before contacting Delhivery. Returned carrier waybills are also checked against the requested one.
- **Reference masking, ordinary case:** a reference containing the current customer mobile is masked without `customers:read`; list tools now pass the granted scopes. See the edited-mobile gap below.
- **OAuth one-time use:** authorization-code consumption uses a conditional update, and refresh rotation claims the old token and creates its successor within a transaction. The concurrent/replay regression tests pass.
- **MCP execution permissions:** shipment confirmation reloads active couriers and permitted pickups; pickup confirmation rechecks assignments. These checks happen before booking. Website/shared-service coverage remains incomplete below.
- **Shipment booking retries:** Delhivery booking is sent once with a 20-second timeout. Network failures, timeouts, HTTP 5xx, and unreadable JSON success responses propagate an unknown-outcome error. The shared create service retains the credit for that outcome; MCP reports reconciliation required.
- **Refund reporting:** the immediate MCP response now reports the actual refund result, including an unsuccessful refund. It no longer infers a refund from HTTP 400.
- **Pickup outcomes:** network/5xx/unreadable-success and accepted-but-save-failed paths are uncertain. An accepted pickup's carrier ID is retained; MCP persists per-location uncertainty and reports reconciliation required.
- **Origin validation:** the route rejects unexpected origins before authentication, including preflights; allowed browser origins and server clients without Origin remain supported. Route-level tests pass.

## Remaining findings

### P1 — Failed cancellation still turns an accepted shipment into an ordinary failure

Source: `src/lib/application/order-creation.ts:340–357` and `src/lib/application/shipments.ts:329–338`.

Reproduction:

1. Delhivery accepts the booking and returns an AWB.
2. Creating the local order row fails.
3. Cancelling the AWB returns `success: false`, for example after a network timeout.

The shared service logs the cancellation failure, refunds the credit, and returns `{ error: 'Failed to create order', creditRefunded: true }`. It omits the AWB and unknown-outcome marker. MCP therefore persists `failed`. The synthetic probe reproduced this complete path.

The shipment may still be live, and preparing another order can duplicate it. Treat an unconfirmed cancellation as reconciliation required, retain the AWB/reference/charge, and resolve billing after the carrier state is known. Test both cancellation success and cancellation failure after a local save failure.

### P1 — Editing the mobile can expose the original number through the reference

Source: `src/lib/application/orders.ts:109–122`; the supported edit route at `src/app/api/orders/[id]/route.ts:11–29,136–145` permits mobile changes independently of the reference.

The mask only replaces digits matching the row's current mobile or reseller mobile. A reference generated from an earlier number remains unchanged after that number is edited.

Synthetic reproduction: create a phone-only reference `9000000001`, change the stored mobile to `9000000002`, then call `getOrder` with only `orders:read`. The response contains masked mobile `******0002` but full reference `9000000001`.

Mask the phone-bearing portions of supported legacy reference formats independently of current contact fields, or expose a separate safe display reference. Preserve the underlying carrier reference for reconciliation. Add list/detail coverage for phone edits and legacy references.

### P1 — Shared order creation still bypasses resource authorization

Source: `src/app/api/orders/route.ts:40–43` and `src/lib/application/order-creation.ts:73–85`.

The new checks live in MCP wrappers. The website POST passes user-supplied pickup and courier directly to the shared service. That service still does not query the actor's pickup assignments or current courier availability before charging and booking.

An authenticated child user can submit a same-tenant pickup they are not assigned, or an inactive courier, through the website API. A synthetic call to the real shared service successfully booked for a child user without any pickup/courier permission lookup. This confirms the prior audit's website/shared-service gap remains; the MCP stale-preview case is fixed.

Enforce the current pickup and courier policy inside the shared service before credit deduction. Keep the MCP checks for useful preview errors and add website API regressions for unassigned pickups and inactive couriers.

### P2 — Shipment reconciliation and refund details are not persisted

Source: `src/lib/application/shipments.ts:329–350`.

On unknown booking outcomes, `createOrder` returns the generated reference and credit transaction ID. The MCP wrapper stores only status, order ID, and error. It drops those reconciliation identifiers and any returned AWB. The probe confirmed that the immediate response and `getShipmentOperation` have no reference or transaction ID and `result` is null.

This is particularly problematic when no order row exists and the reference was generated during booking. Checking the Scan2Ship order list, as the operation note suggests, cannot establish whether Delhivery booked it. Support must reconstruct the missing link from logs.

The actual refund boolean and support note are also only attached to the first response, so retries/status polling lose them. Persist a structured outcome with the carrier reference/AWB, ledger link, and refund state; return the appropriate scope-safe details consistently on initial response, replay, and polling. Direct uncertain-booking recovery toward checking the carrier.

## Updated context

The MCP implementation remains the working, synchronous, preview-based implementation described in the branch re-audit. This patch series adds real protections and 47 passing tests. Remaining work is narrower: close the cancellation failure path, handle legacy reference PII after contact edits, enforce authorization in shared execution, and retain recovery details. No new queue or independent approval workflow is required to close these specific findings.
