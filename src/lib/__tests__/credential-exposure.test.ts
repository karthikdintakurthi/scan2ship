jest.unmock('jsonwebtoken');

jest.mock('next/server', () => {
  const { nextServerMock } = require('@/test-utils/auth-request');
  return nextServerMock;
});
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import fs from 'node:fs';
import { prisma as realPrisma } from '@/lib/prisma';
import { resolveSubmittedApiKey, toPickupLocationDto } from '@/lib/application/credential-dto';
import { authUserRow, signedRequest } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { GET as listPickupLocations } from '@/app/api/pickup-locations/route';
import { GET as getClientSettings, PUT as putClientSettings } from '@/app/api/admin/settings/clients/[id]/route';
import { GET as listClientConfigurations } from '@/app/api/admin/client-configurations/route';

jest.unmock('path');
const { join } = jest.requireActual('path');

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

const DELHIVERY_KEY = 'dlv-secret-0123456789abcdef';

const PICKUPS = [
  { id: 'p1', clientId: 'client-a', value: 'north', label: 'North', delhiveryApiKey: DELHIVERY_KEY },
  { id: 'p2', clientId: 'client-a', value: 'south', label: 'South', delhiveryApiKey: null },
];
function actAs(role: string, clientId = 'client-a') {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role, clientId));
}

async function bodyText(response: { json: () => Promise<unknown> }) {
  return JSON.stringify(await response.json());
}

function loggedText() {
  return [console.log, console.warn, console.error]
    .flatMap((fn) => (fn as jest.Mock).mock.calls.flat())
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join(' ');
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.pickup_locations.findMany as jest.Mock).mockResolvedValue(PICKUPS);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('credential DTO helpers', () => {
  it('replace the Delhivery key with hasApiKey', () => {
    expect(toPickupLocationDto({ id: 'p1', delhiveryApiKey: DELHIVERY_KEY })).toEqual({ id: 'p1', hasApiKey: true });
    expect(toPickupLocationDto({ id: 'p2', delhiveryApiKey: null })).toEqual({ id: 'p2', hasApiKey: false });
    expect(toPickupLocationDto({ id: 'p3', delhiveryApiKey: '   ' })).toEqual({ id: 'p3', hasApiKey: false });
    const withoutKeyField: { id: string; delhiveryApiKey?: string | null } = { id: 'p4' };
    expect(toPickupLocationDto(withoutKeyField)).toEqual({ id: 'p4', hasApiKey: false });
  });

  describe('resolveSubmittedApiKey', () => {
    it.each([
      ['blank', ''],
      ['whitespace', '   '],
      ['masked', '••••••••••••••••abcd'],
      ['missing', undefined],
      ['null', null],
    ])('keeps the stored key when the submitted value is %s', (_label, submitted) => {
      expect(resolveSubmittedApiKey(submitted, 'stored')).toBe('stored');
    });

    it('stores a newly entered key, trimmed', () => {
      expect(resolveSubmittedApiKey('  new-key  ', 'stored')).toBe('new-key');
    });

    it('returns null when there is nothing to keep', () => {
      expect(resolveSubmittedApiKey('', undefined)).toBeNull();
      expect(resolveSubmittedApiKey('', null)).toBeNull();
      expect(resolveSubmittedApiKey(undefined, undefined)).toBeNull();
    });

    it('clears the key when asked, whatever was submitted', () => {
      expect(resolveSubmittedApiKey('new-key', 'stored', { clear: true })).toBeNull();
    });
  });
});

describe('GET /api/pickup-locations', () => {
  it.each(['child_user', 'user', 'client_admin', 'master_admin'])('never returns Delhivery keys to %s', async (role) => {
    actAs(role);
    (prisma.user_pickup_locations.findMany as jest.Mock).mockResolvedValue([{ pickupLocationId: 'p1' }]);

    const response = await listPickupLocations(signedRequest({}, { url: 'http://localhost/api/pickup-locations' }));
    const body = (await response.json()) as { data: Array<Record<string, unknown>> };

    expect(response.status).toBe(200);
    expect(JSON.stringify(body)).not.toContain(DELHIVERY_KEY);
    expect(body.data).toEqual([
      expect.objectContaining({ id: 'p1', hasApiKey: true }),
      expect.objectContaining({ id: 'p2', hasApiKey: false }),
    ]);
    expect(body.data.every((location) => !('delhiveryApiKey' in location))).toBe(true);
  });
});

describe('admin client settings', () => {
  const clientParams = { params: Promise.resolve({ id: 'client-a' }) };

  beforeEach(() => {
    actAs('super_admin', 'platform');
  });

  it('GET returns pickup locations without Delhivery keys', async () => {
    (prisma.clients.findUnique as jest.Mock).mockResolvedValue({
      id: 'client-a',
      pickup_locations: PICKUPS,
      courier_services: [],
      client_order_configs: null,
      client_config: [],
      _count: { users: 0, orders: 0 },
    });

    const response = await getClientSettings(signedRequest(), clientParams);
    const text = await bodyText(response);

    expect(response.status).toBe(200);
    expect(text).not.toContain(DELHIVERY_KEY);
    expect(JSON.parse(text).config.pickupLocations).toEqual([
      expect.objectContaining({ id: 'p1', hasApiKey: true }),
      expect.objectContaining({ id: 'p2', hasApiKey: false }),
    ]);
  });

  function savedPickups() {
    return (prisma.pickup_locations.createMany as jest.Mock).mock.calls[0][0].data as Array<{ value: string; delhiveryApiKey: string | null }>;
  }

  it('PUT keeps stored keys for locations submitted without one, matching by id even when renamed', async () => {
    await putClientSettings(
      signedRequest({
        pickupLocations: [
          { id: 'p1', name: 'North (renamed)', value: 'north-hub', delhiveryApiKey: null },
          { id: 'p2', name: 'South', value: 'south', delhiveryApiKey: '' },
        ],
      }),
      clientParams
    );

    expect(savedPickups()).toEqual([
      expect.objectContaining({ value: 'north-hub', delhiveryApiKey: DELHIVERY_KEY }),
      expect.objectContaining({ value: 'south', delhiveryApiKey: null }),
    ]);
  });

  it('PUT falls back to matching by value for locations without a known id', async () => {
    await putClientSettings(
      signedRequest({ pickupLocations: [{ id: 'temp-1', name: 'North', value: 'north', delhiveryApiKey: '••••••••' }] }),
      clientParams
    );
    expect(savedPickups()).toEqual([expect.objectContaining({ value: 'north', delhiveryApiKey: DELHIVERY_KEY })]);
  });

  it('PUT stores a newly entered key and clears a key when asked', async () => {
    await putClientSettings(
      signedRequest({
        pickupLocations: [
          { id: 'p1', name: 'North', value: 'north', delhiveryApiKey: '', clearDelhiveryApiKey: true },
          { id: 'p2', name: 'South', value: 'south', delhiveryApiKey: 'brand-new-key' },
          { id: 'temp-2', name: 'East', value: 'east', delhiveryApiKey: 'east-key' },
        ],
      }),
      clientParams
    );

    expect(savedPickups()).toEqual([
      expect.objectContaining({ value: 'north', delhiveryApiKey: null }),
      expect.objectContaining({ value: 'south', delhiveryApiKey: 'brand-new-key' }),
      expect.objectContaining({ value: 'east', delhiveryApiKey: 'east-key' }),
    ]);
  });

  it.each([[null], [[]], ['text']])('PUT rejects the non-object body %p without writing', async (body) => {
    const response = await putClientSettings(signedRequest(body), clientParams);
    expect(response.status).toBe(400);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('PUT does not log submitted keys', async () => {
    await putClientSettings(
      signedRequest({ pickupLocations: [{ id: 'p2', name: 'South', value: 'south', delhiveryApiKey: 'brand-new-key' }] }),
      clientParams
    );
    expect(loggedText()).not.toContain('brand-new-key');
  });
});

describe('GET /api/admin/client-configurations', () => {
  it('returns pickup locations without Delhivery keys', async () => {
    actAs('super_admin', 'platform');
    (prisma.clients.findMany as jest.Mock).mockResolvedValue([
      { id: 'client-a', pickup_locations: PICKUPS, courier_services: [], client_config: [], client_order_configs: null, _count: {} },
    ]);

    const response = await listClientConfigurations(signedRequest({}, { url: 'http://localhost/api/admin/client-configurations' }));
    const text = await bodyText(response);

    expect(response.status).toBe(200);
    expect(text).not.toContain(DELHIVERY_KEY);
    expect(JSON.parse(text).clients[0].pickupLocations).toEqual([
      expect.objectContaining({ id: 'p1', hasApiKey: true }),
      expect.objectContaining({ id: 'p2', hasApiKey: false }),
    ]);
  });
});

describe('pages no longer display stored keys', () => {
  const read = (file: string) => fs.readFileSync(join(__dirname, '..', '..', file), 'utf8');

  it('tenant settings shows "configured" instead of the key', () => {
    const page = read('app/settings/page.tsx');
    expect(page).not.toMatch(/\{location\.delhiveryApiKey\}/);
    expect(page).toContain('hasApiKey: location.hasApiKey === true');
  });

  it('admin client settings never pre-fills or displays the stored key', () => {
    const page = read('app/admin/settings/clients/[id]/page.tsx');
    expect(page).not.toMatch(/\{location\.delhiveryApiKey\}/);
    expect(page).not.toContain("delhiveryApiKey: location.delhiveryApiKey || ''");
    expect(page).toContain('Leave blank to keep the current Delhivery API key');
  });

  it('client configurations uses hasApiKey', () => {
    expect(read('app/admin/client-configurations/page.tsx')).toContain('location.hasApiKey &&');
  });

});
