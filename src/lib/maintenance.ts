/**
 * Maintenance mode. The switch lives in Vercel Global Config (formerly Edge
 * Config), key "maintenance",
 * so it can be flipped in seconds without a redeploy and without the database,
 * which may itself be what is under maintenance. Without a connected store it
 * falls back to the MAINTENANCE_MODE environment variable.
 *
 * Edge-safe: used by src/middleware.ts, so no Prisma or Node-only imports.
 *
 * Global Config value, e.g.:
 *   { "mode": "read_only", "message": "Upgrading the database", "until": "2026-10-01T18:30:00Z" }
 *   { "mode": "off", "banner": "Scheduled maintenance tonight 11 PM - 12 AM IST" }
 */
import { get } from '@vercel/global-config';

export type MaintenanceMode = 'off' | 'read_only' | 'full';

export type MaintenanceState = {
  mode: MaintenanceMode;
  /** Shown on the maintenance page and in API errors */
  message: string | null;
  /** Expected end (ISO 8601); drives Retry-After */
  until: string | null;
  /** Advance notice shown in the app while mode is off (or alongside read-only) */
  banner: string | null;
  /** Also pause carrier webhooks and cron jobs (default: they keep running) */
  pauseBackground: boolean;
};

export const MAINTENANCE_OFF: MaintenanceState = {
  mode: 'off',
  message: null,
  until: null,
  banner: null,
  pauseBackground: false,
};

export const BYPASS_COOKIE = 's2s_maintenance_bypass';
export const BYPASS_PARAM = 'maintenance_bypass';
export const MODE_HEADER = 'x-maintenance-mode';

const DEFAULT_RETRY_SECONDS = 600;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 500) : null;
}

/** Accepts only known modes; anything else (typos, bad JSON) means off. */
export function parseMaintenance(raw: unknown): MaintenanceState {
  if (!raw || typeof raw !== 'object') return MAINTENANCE_OFF;
  const value = raw as Record<string, unknown>;
  const mode = value.mode === 'full' || value.mode === 'read_only' ? value.mode : 'off';
  const until = text(value.until);
  return {
    mode,
    message: text(value.message),
    until: until && !Number.isNaN(Date.parse(until)) ? until : null,
    banner: text(value.banner),
    pauseBackground: value.pauseBackground === true,
  };
}

/** Current state. Never throws: if the setting cannot be read, the site stays up. */
export async function readMaintenance(): Promise<MaintenanceState> {
  try {
    // Connecting a store sets GLOBAL_CONFIG (older connections: EDGE_CONFIG); the SDK reads either
    if (process.env.GLOBAL_CONFIG || process.env.EDGE_CONFIG) {
      return parseMaintenance(await get('maintenance'));
    }
  } catch (error) {
    console.error('⚠️ [MAINTENANCE] Could not read Global Config; treating as off:', error instanceof Error ? error.message : String(error));
    return MAINTENANCE_OFF;
  }
  return parseMaintenance({
    mode: process.env.MAINTENANCE_MODE,
    message: process.env.MAINTENANCE_MESSAGE,
    until: process.env.MAINTENANCE_UNTIL,
  });
}

export function retryAfterSeconds(state: MaintenanceState, now = Date.now()): number {
  if (!state.until) return DEFAULT_RETRY_SECONDS;
  const seconds = Math.ceil((Date.parse(state.until) - now) / 1000);
  return seconds > 60 ? seconds : 60;
}

/** Paths that must work in every mode. */
function alwaysAllowed(pathname: string): boolean {
  return (
    pathname === '/maintenance' ||
    pathname === '/api/maintenance/status' ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/')
  );
}

/** Carrier webhooks and scheduled jobs: keep running unless pauseBackground. */
function isBackground(pathname: string): boolean {
  return pathname.startsWith('/api/webhooks/') || pathname.startsWith('/api/cron/');
}

/**
 * Writes still allowed in read-only mode: signing in and out, connecting an
 * assistant, and analytics pings. MCP handles its own writes (it pauses its
 * write tools in read-only mode).
 */
function allowedWriteInReadOnly(pathname: string): boolean {
  return (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/oauth/') ||
    pathname === '/api/mcp' ||
    pathname === '/api/analytics/track'
  );
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type MaintenanceDecision = { action: 'pass' } | { action: 'page' } | { action: 'api' };

/** What to do with a request while maintenance may be on. */
export function decideMaintenance(input: {
  pathname: string;
  method: string;
  state: MaintenanceState;
  bypass: boolean;
}): MaintenanceDecision {
  const { pathname, state } = input;
  if (state.mode === 'off' || input.bypass || alwaysAllowed(pathname)) return { action: 'pass' };
  if (isBackground(pathname)) return state.pauseBackground ? { action: 'api' } : { action: 'pass' };

  const isApi = pathname.startsWith('/api/') || pathname.startsWith('/.well-known/');
  if (state.mode === 'full') return isApi ? { action: 'api' } : { action: 'page' };

  // read_only: everything can be viewed; only changes are blocked
  if (!isApi || SAFE_METHODS.has(input.method.toUpperCase())) return { action: 'pass' };
  return allowedWriteInReadOnly(pathname) ? { action: 'pass' } : { action: 'api' };
}

/** Body for API requests refused during maintenance. */
export function maintenanceApiBody(state: MaintenanceState) {
  return {
    error: 'maintenance',
    mode: state.mode,
    message:
      state.message ??
      (state.mode === 'read_only'
        ? 'Scan2Ship is in read-only maintenance. You can view data, but changes are paused.'
        : 'Scan2Ship is down for maintenance. Please try again shortly.'),
    until: state.until,
  };
}

/** Hex SHA-256 via Web Crypto (available in the Edge runtime and Node 18+). */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The bypass secret, if one long enough to be safe is configured. */
export function bypassSecret(): string | null {
  const secret = process.env.MAINTENANCE_BYPASS_SECRET;
  return secret && secret.length >= 16 ? secret : null;
}
