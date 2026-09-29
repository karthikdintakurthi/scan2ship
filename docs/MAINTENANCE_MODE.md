# Maintenance mode

Switch the whole site into maintenance without a redeploy, even when the database is down.

## Modes

| Mode | Pages | API | MCP (Claude) |
|---|---|---|---|
| `off` | Normal | Normal | Normal |
| `read_only` | Load normally, with an amber "read-only maintenance" bar | Reads work. Changes (`POST`/`PUT`/`PATCH`/`DELETE`) get `503 {"error":"maintenance"}`, except sign-in, sign-out, token refresh, and connecting an assistant | Reads work; shipment and pickup tools are hidden and refused |
| `full` | Redirect to `/maintenance` (HTTP 503, `Retry-After`), which returns users to their page when maintenance ends | `503 {"error":"maintenance"}` | `503` |

In every mode, static files, `/maintenance`, and `/api/maintenance/status` keep working. Carrier webhooks and cron jobs (`/api/webhooks/*`, `/api/cron/*`) keep running unless `pauseBackground` is `true`.

## Switching it (Vercel Global Config)

Vercel renamed Edge Config to **Global Config** (2026); the code uses `@vercel/global-config`, which reads `GLOBAL_CONFIG` and falls back to `EDGE_CONFIG`.

One-time setup: open the project in Vercel → **Storage** → **Create Storage** → **Global Config** → **Continue** → name the store (for example `scan2ship-maintenance`) → **Create**. Connecting it to the project creates the `GLOBAL_CONFIG` environment variable. Scope that variable to the environments that should obey the switch (for beta: Preview, branch `feature/mcp-implementation`), then redeploy once. The Hobby plan allows one store.

Then edit the store's **Items**. There is no redeploy.

```json
{ "maintenance": { "mode": "full", "message": "Upgrading Scan2Ship", "until": "2026-10-01T18:30:00Z" } }
```

| Field | Meaning |
|---|---|
| `mode` | `off`, `read_only`, or `full`. Anything else counts as `off`. |
| `message` | Shown on the maintenance page, in the read-only bar, and in API errors |
| `until` | Expected end (ISO 8601). Shown in IST and used for `Retry-After` |
| `banner` | Advance notice shown at the bottom of the app while `mode` is `off`, e.g. "Scheduled maintenance tonight 11 PM – 12 AM IST" |
| `pauseBackground` | `true` also pauses webhooks and cron |

To end maintenance, set `mode` to `off` (or delete the key). Changes reach every region within about 10 seconds. If Global Config cannot be read, the site stays up.

Without a connected store, set `MAINTENANCE_MODE`, `MAINTENANCE_MESSAGE`, and `MAINTENANCE_UNTIL` as environment variables and redeploy.

## Using the site during maintenance

Set `MAINTENANCE_BYPASS_SECRET` (16+ characters). Open any page with `?maintenance_bypass=<secret>` to get a 12-hour cookie that lets that browser use the site normally, for example to check a deploy. `?maintenance_bypass=off` removes it.

## Code

`src/middleware.ts` applies the decision from `decideMaintenance` in `src/lib/maintenance.ts`. The page is `src/app/maintenance/page.tsx`, and the bar is `src/components/MaintenanceBanner.tsx`.
