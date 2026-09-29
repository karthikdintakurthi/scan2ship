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

`quote_shipping` returns `configured_estimate` from the tenant rate table, not a live carrier quote. Tracking reads persisted status and does not refresh Delhivery. `get_order` omits street address unless `customers:read` was granted (not in the default set).

Writes (`prepare_shipment` / `commit_shipment`) are not in this pilot.

## Kill switch

Set `MCP_ENABLED=false` or remove the tenant from `MCP_TENANT_ALLOWLIST`. Existing access tokens fail on the next call because each request re-checks the grant, user, tenant, and allowlist.
