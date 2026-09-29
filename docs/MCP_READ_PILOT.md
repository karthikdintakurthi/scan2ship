# Scan2Ship customer MCP (read pilot)

This branch is the codebase for a **later, separate app**. It is not merged to current production `main`.

## What is implemented

A remote MCP server at `/api/mcp` (Streamable HTTP, JSON responses, stateless). Customers connect an AI assistant with OAuth. Tools can only see the tenant on the grant.

Milestone:

**Connect → approve `orders:read` → search own orders → cannot read another tenant → revoke → next call denied.**

## Enable it

```
MCP_ENABLED=true
MCP_TENANT_ALLOWLIST=tenant-id-1,tenant-id-2
MCP_PUBLIC_BASE_URL=https://your-mcp-host.example
MCP_JWT_SECRET=<32+ character secret, distinct from the website JWT if possible>
MCP_ALLOWED_HOSTS=your-mcp-host.example
```

`MCP_TENANT_ALLOWLIST=*` allows every tenant (local only). An empty allowlist allows none.

Apply Prisma migration `20260929180000_mcp_read_pilot` on **this app’s database**, not current Scan2Ship production.

## Connect a client

1. Resource URL: `https://your-mcp-host.example/api/mcp`
2. Discovery: `/.well-known/oauth-protected-resource` and `/.well-known/oauth-authorization-server`
3. Dynamic client registration: `POST /api/oauth/register`
4. User signs in, approves scopes at `/oauth/authorize`
5. Manage or revoke at `/settings/connections`

PKCE `S256` is required. Access tokens last 15 minutes and are bound to audience `/api/mcp`. Website login JWTs are rejected.

## Tools (read only)

| Tool | Scope |
|---|---|
| `get_account_context` | `settings:read` |
| `search_orders` | `orders:read` |
| `get_order` | `orders:read` |
| `get_tracking_status` | `tracking:read` |
| `list_shipping_options` | `settings:read` |
| `quote_shipping` | `shipping:quote` |
| `get_credit_balance` | `credits:read` |
| `get_customer_order_history` | `customers:read` (optional) |
| `get_shipping_label` | `labels:read` (optional) |

`quote_shipping` returns `configured_estimate` from the tenant rate table, not a live carrier quote. Tracking reads persisted status and does not refresh Delhivery. `get_order` omits street address unless `customers:read` was granted (not in the default set).

`customers:read` and `labels:read` are opt-in: they appear unticked on the approval page and are granted only if the user ticks them, even when the assistant requests them. A connection is only shown the tools its scopes allow.

`get_customer_order_history` looks up the last 10 digits of a customer or reseller mobile within the tenant's configured history window (1–365 days, up to 25 orders). It returns `enabled: false` when the tenant has history turned off, and applies the child-user sub-group rule. Like the create-order screen's history, it does not match the ~0.1% of orders whose stored mobile contains spaces or symbols.

`get_shipping_label` returns a link, `/api/mcp/labels/<signed token>`, valid for 10 minutes. The token uses its own audience, so it cannot act as an access token. Opening it re-checks the grant, user, tenant allowlist, role, `labels:read`, and order access, so revoking the connection disables its links. The label defaults to the tenant's print mode (`standard`, `thermal`, `a5`, `r4`).

## Shipment creation (Phase 4)

Off unless `MCP_WRITES_ENABLED=true`. The tools are listed only while it is on, and only to connections that ticked the opt-in `shipments:create` scope. Child users may have that scope; it maps to the existing `shipments:book` action.

| Tool | What it does |
|---|---|
| `prepare_shipment` | Checks the recipient, package, payment, courier (must be active for the tenant), and pickup location (must be permitted to the user), then saves a preview valid for 15 minutes with its credit cost and current balance. Nothing is charged and no carrier is contacted. |
| `create_shipment` | Creates the order for a preview the user confirmed in chat. It runs the same code as the website's Create Order (`createOrder` in `src/lib/application/order-creation.ts`): it charges the credit, books the Delhivery waybill for Delhivery orders, saves the order, and refunds the credit if booking fails. |
| `get_shipment_operation` | Returns the status of a preview or creation. |

- **Tracking numbers depend on the courier.**
  - **Delhivery.** The waybill comes from the Delhivery API when the order is created, and a supplied number is refused.
  - **DTDC** (`dtdc`, `dtdc_cod`, `dtdc_plus`). Uses the user's number if given; otherwise the next unused number from that variant's list in Settings. The preview only shows the number; `createOrder` takes it on creation, atomically, so two orders never share one. The website uses the same claim. It goes back to the unused list if the order is not created. With no unused numbers the order has no tracking number. A number the user gives that appears in the unused list is moved to used.
  - **India Post and other couriers.** Uses the number the user gives, or none. `referenceNumber` is the seller's own reference; Scan2Ship appends the customer mobile. It is never a tracking number.
- **One preview, at most one order.** `create_shipment` claims the preview atomically (`previewed` → `creating`). A repeated or concurrent call returns the first outcome instead of ordering again.
- **Outcomes.** `succeeded` (with order ID and waybill); `failed` (not created; a Delhivery rejection refunds the credit); `expired`; `reconciliation_required` (an order may exist, e.g. it was saved but its carrier details were not, or the request died mid-way; check Scan2Ship and never retry blindly).
- **Limits.** Up to `MCP_DAILY_SHIPMENT_LIMIT` (default 25) assistant-created orders per tenant per UTC day. The per-grant tool quota also applies.
- **Confirmation** happens in chat: the preview is shown and the user confirms. `create_shipment` is annotated as having external effects, so clients ask before calling it.
- **Beta warning.** Beta holds live Delhivery keys copied from production, so a Delhivery shipment created on beta books a real waybill on that tenant's Delhivery account. Test with a non-Delhivery courier first (no carrier call), or with a tenant whose Delhivery key points at a test account.

Pickup booking (`prepare_pickup` / `commit_pickup`) is not built yet.

## Kill switch

Set `MCP_ENABLED=false` or remove the tenant from `MCP_TENANT_ALLOWLIST`. Existing access tokens fail on the next call because each request re-checks the grant, user, tenant, and allowlist.

## Deployment (beta)

`https://beta.scan2ship.in` is the Vercel **Preview** deployment of branch `feature/mcp-implementation` in the `scan2ship` project. The `MCP_*` variables are scoped to Preview on that branch only. Preview `DATABASE_URL` is the beta Railway database; it applies to every preview branch of the project, not only this one.

The beta database was created from the committed migrations (all 39; `prisma migrate diff` against `schema.prisma` is empty) and loaded with the 2026-09-13 local production copy. It holds real customer data and live Delhivery and Catalog keys.

## Acceptance results (2026-09-29)

| Check | Result |
|---|---|
| Discovery: protected-resource and authorization-server metadata | Pass |
| Unauthenticated call returns 401 with `WWW-Authenticate` resource metadata | Pass |
| Dynamic client registration with Claude web callbacks and a localhost callback | Pass |
| Claude (web/desktop custom connector): connect, consent, read tools | Pass |
| Claude Code (`claude mcp add --transport http`): connect, read tools | Pass (reported by owner) |
| Another tenant's order ID and tracking number return `not_found` | Pass |
| Revoke in `/settings/connections`: grant and all its refresh tokens revoked, next call denied, `MCP_GRANT_REVOKED` audited | Pass |
| Disconnect inside Claude | Drops Claude's tokens only; Claude does not call the revocation endpoint, so the grant stays active until revoked in Scan2Ship or the refresh token expires (14 days) |
| Access-token expiry (15 min) and refresh | Pending: needs a connected client left idle past expiry |

## Role ceiling

Granted scopes are limited by the connecting user's role at consent and again on every call (`scopesAllowedForUser`), so a demoted user loses scopes without reconnecting. Child users do not receive `credits:read`, matching the website, which has no wallet for them. Users with an unrecognised role are rejected.
