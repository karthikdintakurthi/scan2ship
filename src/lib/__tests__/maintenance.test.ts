/**
 * @jest-environment node
 *
 * Maintenance mode: the switch (Edge Config, else env), the per-request
 * decision, the middleware (bypass cookie, redirects, 503s), the status
 * endpoint, and MCP pausing its write tools in read-only mode.
 */
jest.mock('@vercel/edge-config', () => ({ get: jest.fn() }));

// Minimal next/server stand-in: the middleware only needs these behaviours
jest.mock('next/server', () => {
  type FakeInit = { status?: number; headers?: Record<string, string>; request?: { headers: Headers } };
  class Cookies {
    store = new Map<string, { value: string; options?: Record<string, unknown> }>();
    deleted: string[] = [];
    set(name: string, value: string, options?: Record<string, unknown>) { this.store.set(name, { value, options }); }
    delete(name: string) { this.deleted.push(name); }
  }
  class FakeResponse {
    cookies = new Cookies();
    constructor(public kind: string, public init: FakeInit = {}, public target?: string, public body?: unknown) {}
    get status() { return this.init.status ?? (this.kind === 'redirect' ? 307 : 200); }
    header(name: string) { return this.init.headers?.[name]; }
  }
  return {
    NextResponse: {
      next: (init?: Record<string, unknown>) => new FakeResponse('next', init),
      redirect: (url: URL, init?: Record<string, unknown>) => new FakeResponse('redirect', init, url.toString()),
      rewrite: (url: URL, init?: Record<string, unknown>) => new FakeResponse('rewrite', init, url.toString()),
      json: (body: unknown, init?: Record<string, unknown>) => new FakeResponse('json', init, undefined, body),
    },
  };
});

import { get as edgeGet } from '@vercel/edge-config';
import {
  BYPASS_COOKIE,
  decideMaintenance,
  MAINTENANCE_OFF,
  MODE_HEADER,
  parseMaintenance,
  readMaintenance,
  retryAfterSeconds,
  sha256Hex,
  type MaintenanceState,
} from '@/lib/maintenance';
import { middleware } from '@/middleware';
import { GET as statusRoute } from '@/app/api/maintenance/status/route';

const edge = edgeGet as jest.Mock;
const SECRET = 'bypass-secret-at-least-16';

const state = (mode: MaintenanceState['mode'], extra: Partial<MaintenanceState> = {}): MaintenanceState => ({ ...MAINTENANCE_OFF, mode, ...extra });

function request(path: string, { method = 'GET', cookie }: { method?: string; cookie?: string } = {}) {
  const url = new URL(path, 'https://beta.scan2ship.in');
  const nextUrl = Object.assign(url, { clone: () => new URL(url.toString()) });
  return {
    url: url.toString(),
    nextUrl,
    method,
    headers: new Headers({ authorization: 'Bearer x' }),
    cookies: { get: (name: string) => (name === BYPASS_COOKIE && cookie ? { value: cookie } : undefined) },
  } as never;
}

type Fake = {
  kind: string;
  status: number;
  target?: string;
  body?: unknown;
  init: { request?: { headers: Headers } };
  cookies: { store: Map<string, { value: string; options?: Record<string, unknown> }>; deleted: string[] };
  header: (name: string) => string;
};

beforeAll(() => {
  // jest.setup.js stubs global crypto; the middleware runs on the Edge runtime, which has Web Crypto
  Object.defineProperty(globalThis, 'crypto', { value: jest.requireActual('crypto').webcrypto, configurable: true });
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.EDGE_CONFIG = 'https://edge-config.vercel.com/ecfg_test?token=t';
  process.env.MAINTENANCE_BYPASS_SECRET = SECRET;
  delete process.env.MAINTENANCE_MODE;
});

describe('reading the switch', () => {
  it('reads Edge Config and ignores unknown modes', async () => {
    edge.mockResolvedValue({ mode: 'read_only', message: 'DB upgrade', until: '2026-10-01T18:30:00Z' });
    expect(await readMaintenance()).toMatchObject({ mode: 'read_only', message: 'DB upgrade', until: '2026-10-01T18:30:00Z' });
    expect(parseMaintenance({ mode: 'FULL' }).mode).toBe('off');
    expect(parseMaintenance('garbage').mode).toBe('off');
    expect(parseMaintenance({ mode: 'full', until: 'not a date' }).until).toBeNull();
  });

  it('keeps the site up if Edge Config cannot be read', async () => {
    edge.mockRejectedValue(new Error('network'));
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect((await readMaintenance()).mode).toBe('off');
  });

  it('falls back to MAINTENANCE_MODE without Edge Config', async () => {
    delete process.env.EDGE_CONFIG;
    process.env.MAINTENANCE_MODE = 'full';
    expect((await readMaintenance()).mode).toBe('full');
    expect(edge).not.toHaveBeenCalled();
  });

  it('derives Retry-After from the expected end, with sensible bounds', () => {
    const now = Date.parse('2026-10-01T18:00:00Z');
    expect(retryAfterSeconds(state('full', { until: '2026-10-01T18:30:00Z' }), now)).toBe(1800);
    expect(retryAfterSeconds(state('full', { until: '2026-10-01T17:00:00Z' }), now)).toBe(60);
    expect(retryAfterSeconds(state('full'), now)).toBe(600);
  });
});

describe('decideMaintenance', () => {
  const decide = (pathname: string, mode: MaintenanceState['mode'], method = 'GET', extra: Partial<MaintenanceState> = {}, bypass = false) =>
    decideMaintenance({ pathname, method, state: state(mode, extra), bypass }).action;

  it('lets everything through when off or bypassed', () => {
    expect(decide('/orders', 'off')).toBe('pass');
    expect(decide('/orders', 'full', 'GET', {}, true)).toBe('pass');
    expect(decide('/api/orders', 'full', 'POST', {}, true)).toBe('pass');
  });

  it('full: pages go to the maintenance page and APIs get 503', () => {
    expect(decide('/view-orders', 'full')).toBe('page');
    expect(decide('/', 'full')).toBe('page');
    expect(decide('/api/orders', 'full')).toBe('api');
    expect(decide('/api/mcp', 'full', 'POST')).toBe('api');
    expect(decide('/.well-known/oauth-protected-resource/api/mcp', 'full')).toBe('api');
  });

  it('read-only: viewing works, changes are refused', () => {
    expect(decide('/view-orders', 'read_only')).toBe('pass');
    expect(decide('/api/orders', 'read_only', 'GET')).toBe('pass');
    expect(decide('/api/orders', 'read_only', 'POST')).toBe('api');
    expect(decide('/api/orders/5', 'read_only', 'PUT')).toBe('api');
    expect(decide('/api/pickup-request', 'read_only', 'POST')).toBe('api');
    expect(decide('/api/orders', 'read_only', 'DELETE')).toBe('api');
  });

  it('read-only: signing in, connecting an assistant, and MCP reads still work', () => {
    for (const path of ['/api/auth/login', '/api/auth/refresh', '/api/auth/logout', '/api/oauth/token', '/api/oauth/consent', '/api/mcp']) {
      expect(decide(path, 'read_only', 'POST')).toBe('pass');
    }
  });

  it('always serves the maintenance page, its status, and static assets', () => {
    for (const path of ['/maintenance', '/api/maintenance/status', '/_next/static/chunk.js', '/favicon.ico', '/manifest.json', '/images/uploads/logos/a.png']) {
      expect(decide(path, 'full')).toBe('pass');
    }
  });

  it('keeps carrier webhooks and cron running unless paused', () => {
    expect(decide('/api/webhooks/delhivery', 'full', 'POST')).toBe('pass');
    expect(decide('/api/cron/tracking', 'read_only', 'POST')).toBe('pass');
    expect(decide('/api/webhooks/delhivery', 'full', 'POST', { pauseBackground: true })).toBe('api');
  });
});

describe('middleware', () => {
  it('does nothing while maintenance is off', async () => {
    edge.mockResolvedValue({ mode: 'off' });
    expect(((await middleware(request('/view-orders'))) as unknown as Fake).kind).toBe('next');
  });

  it('full: redirects pages to /maintenance, remembering where the user was', async () => {
    edge.mockResolvedValue({ mode: 'full' });
    const response = (await middleware(request('/view-orders?page=2'))) as unknown as Fake;
    expect(response.kind).toBe('redirect');
    expect(new URL(response.target!).pathname).toBe('/maintenance');
    expect(new URL(response.target!).searchParams.get('from')).toBe('/view-orders?page=2');
  });

  it('full: serves the maintenance page itself as 503 with Retry-After', async () => {
    edge.mockResolvedValue({ mode: 'full', until: new Date(Date.now() + 20 * 60_000).toISOString() });
    const response = (await middleware(request('/maintenance?from=/'))) as unknown as Fake;
    expect(response.kind).toBe('rewrite');
    expect(response.status).toBe(503);
    expect(Number(response.header('Retry-After'))).toBeGreaterThan(1100);
  });

  it('answers APIs with a 503 JSON explanation', async () => {
    edge.mockResolvedValue({ mode: 'read_only', message: 'Migrating' });
    const response = (await middleware(request('/api/orders', { method: 'POST' }))) as unknown as Fake;
    expect(response.kind).toBe('json');
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'maintenance', mode: 'read_only', message: 'Migrating', until: null });
  });

  it('tells route handlers the mode on requests it lets through', async () => {
    edge.mockResolvedValue({ mode: 'read_only' });
    const response = (await middleware(request('/api/mcp', { method: 'POST' }))) as unknown as Fake;
    expect(response.kind).toBe('next');
    expect(response.init.request!.headers.get(MODE_HEADER)).toBe('read_only');
  });

  it('sets a bypass cookie for the right secret and lets that browser in', async () => {
    const set = (await middleware(request(`/orders?maintenance_bypass=${SECRET}`))) as unknown as Fake;
    expect(set.kind).toBe('redirect');
    expect(new URL(set.target!).searchParams.has('maintenance_bypass')).toBe(false);
    const cookie = set.cookies.store.get(BYPASS_COOKIE)!;
    expect(cookie.value).toBe(await sha256Hex(SECRET));
    expect(cookie.value).not.toContain(SECRET);
    expect(cookie.options).toMatchObject({ httpOnly: true, secure: true });

    edge.mockResolvedValue({ mode: 'full' });
    const allowed = (await middleware(request('/orders', { cookie: cookie.value }))) as unknown as Fake;
    expect(allowed.kind).toBe('next');
    expect(allowed.init.request!.headers.get(MODE_HEADER)).toBe('off');
  });

  it('ignores a wrong secret or a forged cookie', async () => {
    const wrong = (await middleware(request('/orders?maintenance_bypass=guess'))) as unknown as Fake;
    expect(wrong.cookies.store.size).toBe(0);

    edge.mockResolvedValue({ mode: 'full' });
    const forged = (await middleware(request('/orders', { cookie: 'forged' }))) as unknown as Fake;
    expect(forged.kind).toBe('redirect');
  });

  it('offers no bypass when no secret is configured', async () => {
    delete process.env.MAINTENANCE_BYPASS_SECRET;
    const response = (await middleware(request('/orders?maintenance_bypass=anything'))) as unknown as Fake;
    expect(response.cookies.store.size).toBe(0);
  });

  it('can remove the bypass cookie', async () => {
    const response = (await middleware(request('/?maintenance_bypass=off'))) as unknown as Fake;
    expect(response.cookies.deleted).toContain(BYPASS_COOKIE);
  });
});

describe('GET /api/maintenance/status', () => {
  it('reports the public parts of the state', async () => {
    edge.mockResolvedValue({ mode: 'off', banner: 'Maintenance tonight 11 PM IST', pauseBackground: true });
    const response = (await statusRoute()) as unknown as Fake;
    expect(response.body).toEqual({ mode: 'off', message: null, until: null, banner: 'Maintenance tonight 11 PM IST' });
  });
});
