jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import crypto from 'crypto';
import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import { API_KEY_SCOPES, authenticateApiKey, hashApiKey, hasPermission, isApiKeyScope, type AuthenticatedApiKey } from '@/lib/api-key-auth';
import {
  DEFAULT_API_KEY_LIFETIME_DAYS,
  MAX_API_KEY_LIFETIME_DAYS,
  generateApiKey,
  parseApiKeyExpiry,
  parseApiKeyScopes,
  toApiKeyDto,
} from '@/lib/application/api-key-provisioning';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { GET as listKeys, POST as createKey } from '@/app/api/api-keys/route';
import { PUT as updateKey, DELETE as deleteKey } from '@/app/api/api-keys/[id]/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const keys = prisma.api_keys;
const RAW_KEY = 'sk_' + 'a'.repeat(64);

function bearer(token: string | null) {
  return { headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? token : null) } } as unknown as NextRequest;
}

function keyRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'key-1',
    name: 'Partner',
    key: hashApiKey(RAW_KEY),
    keyPrefix: RAW_KEY.slice(0, 12),
    clientId: 'client-a',
    permissions: ['orders:read'],
    isActive: true,
    lastUsedAt: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    createdAt: new Date(),
    updatedAt: new Date(),
    clients: { isActive: true },
    ...overrides,
  };
}

function actAs(role: string) {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('hashApiKey', () => {
  it('is a prefixed SHA-256 of the raw key', () => {
    expect(hashApiKey(RAW_KEY)).toBe('sha256:' + crypto.createHash('sha256').update(RAW_KEY).digest('hex'));
    expect(hashApiKey(RAW_KEY)).not.toContain(RAW_KEY);
    expect(hashApiKey('sk_other')).not.toBe(hashApiKey(RAW_KEY));
  });
});

describe('scopes', () => {
  it('recognizes only the defined scopes', () => {
    for (const scope of API_KEY_SCOPES) expect(isApiKeyScope(scope)).toBe(true);
    for (const value of ['*', 'orders:*', 'admin', '', 5]) expect(isApiKeyScope(value)).toBe(false);
  });

  it('hasPermission requires an exact grant and ignores wildcards', () => {
    const key = (permissions: string[]) => ({ permissions }) as AuthenticatedApiKey;
    expect(hasPermission(key(['orders:read']), 'orders:read')).toBe(true);
    expect(hasPermission(key(['orders:read']), 'orders:write')).toBe(false);
    expect(hasPermission(key(['*']), 'orders:read')).toBe(false);
  });
});

describe('authenticateApiKey', () => {
  it('looks the key up by its hash and never returns the stored value', async () => {
    (keys.findUnique as jest.Mock).mockResolvedValue(keyRecord());

    const result = await authenticateApiKey(bearer(`Bearer ${RAW_KEY}`));

    expect((keys.findUnique as jest.Mock).mock.calls[0][0].where).toEqual({ key: hashApiKey(RAW_KEY) });
    expect(result).toMatchObject({ id: 'key-1', clientId: 'client-a', keyPrefix: RAW_KEY.slice(0, 12), permissions: ['orders:read'] });
    expect(result).not.toHaveProperty('key');
    expect(keys.update).toHaveBeenCalledWith({ where: { id: 'key-1' }, data: { lastUsedAt: expect.any(Date) } });
  });

  it.each([
    ['no header', null],
    ['a non-Bearer header', `Basic ${RAW_KEY}`],
    ['an empty token', 'Bearer   '],
  ])('rejects %s without querying', async (_label, header) => {
    expect(await authenticateApiKey(bearer(header))).toBeNull();
    expect(keys.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown', null],
    ['inactive', keyRecord({ isActive: false })],
    ['for an inactive tenant', keyRecord({ clients: { isActive: false } })],
    ['expired', keyRecord({ expiresAt: new Date(Date.now() - 1000) })],
  ])('rejects an %s key', async (_label, record) => {
    (keys.findUnique as jest.Mock).mockResolvedValue(record);
    expect(await authenticateApiKey(bearer(`Bearer ${RAW_KEY}`))).toBeNull();
    expect(keys.update).not.toHaveBeenCalled();
  });

  it('accepts a key with no expiry', async () => {
    (keys.findUnique as jest.Mock).mockResolvedValue(keyRecord({ expiresAt: null }));
    expect(await authenticateApiKey(bearer(`Bearer ${RAW_KEY}`))).not.toBeNull();
  });

  it('returns null when the lookup fails', async () => {
    (keys.findUnique as jest.Mock).mockRejectedValue(new Error('db down'));
    expect(await authenticateApiKey(bearer(`Bearer ${RAW_KEY}`))).toBeNull();
  });
});

describe('key provisioning helpers', () => {
  it('parseApiKeyScopes accepts known scopes and removes duplicates', () => {
    expect(parseApiKeyScopes(['orders:read', 'orders:read', 'orders:write'])).toEqual({ ok: true, value: ['orders:read', 'orders:write'] });
  });

  it.each([[[]], [['*']], [['orders:read', 'admin']], ['orders:read'], [undefined]])('parseApiKeyScopes rejects %p', (input) => {
    expect(parseApiKeyScopes(input)).toMatchObject({ ok: false });
  });

  it('parseApiKeyExpiry defaults to one year and accepts 1 to 365 days', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const day = 24 * 60 * 60 * 1000;
    expect(parseApiKeyExpiry(undefined, now)).toEqual({ ok: true, value: new Date(now.getTime() + DEFAULT_API_KEY_LIFETIME_DAYS * day) });
    expect(parseApiKeyExpiry(null, now)).toMatchObject({ ok: true });
    expect(parseApiKeyExpiry('30', now)).toEqual({ ok: true, value: new Date(now.getTime() + 30 * day) });
    expect(parseApiKeyExpiry(1, now)).toMatchObject({ ok: true });
  });

  it.each([0, 366, 1.5, 'never', -1])('parseApiKeyExpiry rejects %p', (days) => {
    expect(parseApiKeyExpiry(days)).toMatchObject({ ok: false });
  });

  it('parseApiKeyExpiry caps the lifetime at the maximum', () => {
    expect(parseApiKeyExpiry(MAX_API_KEY_LIFETIME_DAYS)).toMatchObject({ ok: true });
    expect(parseApiKeyExpiry(MAX_API_KEY_LIFETIME_DAYS + 1)).toMatchObject({ ok: false });
  });

  it('parseApiKeyExpiry uses the current time by default', () => {
    const result = parseApiKeyExpiry(1);
    expect(result.ok && result.value.getTime()).toBeGreaterThan(Date.now());
  });

  it('generateApiKey returns a random key, its hash, and a display prefix', () => {
    const first = generateApiKey();
    const second = generateApiKey();
    expect(first.raw).toMatch(/^sk_[0-9a-f]{64}$/);
    expect(first.hash).toBe(hashApiKey(first.raw));
    expect(first.prefix).toBe(first.raw.slice(0, 12));
    expect(second.raw).not.toBe(first.raw);
  });

  it('toApiKeyDto never includes the stored key or secret', () => {
    const dto = toApiKeyDto({ ...keyRecord(), secret: 'x' } as never);
    expect(dto).not.toHaveProperty('key');
    expect(dto).not.toHaveProperty('secret');
    expect(dto).toMatchObject({ id: 'key-1', keyPrefix: RAW_KEY.slice(0, 12) });

    const { updatedAt, ...withoutUpdatedAt } = keyRecord();
    expect(toApiKeyDto(withoutUpdatedAt as never)).not.toHaveProperty('updatedAt');
    expect(updatedAt).toBeInstanceOf(Date);
  });
});

describe('GET /api/api-keys', () => {
  it('lists keys by prefix and never selects the stored hash', async () => {
    actAs('user');
    (keys.findMany as jest.Mock).mockResolvedValue([{ ...keyRecord(), key: undefined }]);

    const response = await listKeys(signedRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    const { select, where } = (keys.findMany as jest.Mock).mock.calls[0][0];
    expect(select).not.toHaveProperty('key');
    expect(select).toMatchObject({ keyPrefix: true });
    expect(where).toEqual({ clientId: 'client-a', isActive: true });
    expect(body.apiKeys[0]).not.toHaveProperty('key');
  });

  it('returns 500 when listing fails', async () => {
    actAs('user');
    (keys.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await listKeys(signedRequest())).status).toBe(500);
  });
});

describe('POST /api/api-keys', () => {
  beforeEach(() => {
    (keys.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, isActive: true, lastUsedAt: null, createdAt: new Date() }));
  });

  it.each(['child_user', 'user'])('is not available to %s', async (role) => {
    actAs(role);
    const response = await createKey(signedRequest({ name: 'Partner', permissions: ['orders:read'] }));
    expect(response.status).toBe(403);
    expect(keys.create).not.toHaveBeenCalled();
  });

  it('stores only the hash, returns the raw key once, and records the creator', async () => {
    actAs('client_admin');

    const response = await createKey(signedRequest({ name: 'Partner', permissions: ['orders:read', 'orders:write'], expiresInDays: 30 }));
    const body = await response.json();

    expect(response.status).toBe(201);
    const stored = (keys.create as jest.Mock).mock.calls[0][0].data;
    expect(stored.key).toBe(hashApiKey(body.apiKey.key));
    expect(stored).toMatchObject({ keyPrefix: body.apiKey.key.slice(0, 12), createdById: TEST_USER_ID, clientId: 'client-a', permissions: ['orders:read', 'orders:write'] });
    expect(stored).not.toHaveProperty('secret');
    expect(body.apiKey.key).toMatch(/^sk_/);
    expect(body.apiKey).not.toHaveProperty('secret');
    expect(body.message).toContain('will not be shown again');
  });

  it('defaults to read-only orders access and a one-year expiry', async () => {
    actAs('client_admin');
    await createKey(signedRequest({ name: 'Partner' }));
    const stored = (keys.create as jest.Mock).mock.calls[0][0].data;
    expect(stored.permissions).toEqual(['orders:read']);
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now() + 364 * 86_400_000);
  });

  it.each([
    ['a wildcard permission', { name: 'P', permissions: ['*'] }],
    ['an unknown permission', { name: 'P', permissions: ['admin'] }],
    ['an empty permission list', { name: 'P', permissions: [] }],
    ['an invalid expiry', { name: 'P', expiresInDays: 0 }],
    ['a missing name', { permissions: ['orders:read'] }],
    ['a null body', null],
  ])('rejects %s', async (_label, body) => {
    actAs('client_admin');
    const response = await createKey(signedRequest(body));
    expect(response.status).toBe(400);
    expect(keys.create).not.toHaveBeenCalled();
  });

  it('returns 500 when saving fails', async () => {
    actAs('client_admin');
    (keys.create as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await createKey(signedRequest({ name: 'P' }))).status).toBe(500);
  });
});

describe('PUT and DELETE /api/api-keys/[id]', () => {
  const params = { params: Promise.resolve({ id: 'key-1' }) };

  beforeEach(() => {
    (keys.findFirst as jest.Mock).mockResolvedValue(keyRecord());
    (keys.update as jest.Mock).mockImplementation(async ({ data }) => ({ ...keyRecord(), ...data }));
  });

  it.each(['child_user', 'user'])('PUT is not available to %s', async (role) => {
    actAs(role);
    expect((await updateKey(signedRequest({ name: 'x' }), params)).status).toBe(403);
    expect(keys.update).not.toHaveBeenCalled();
  });

  it.each(['child_user', 'user'])('DELETE is not available to %s', async (role) => {
    actAs(role);
    expect((await deleteKey(signedRequest(), params)).status).toBe(403);
    expect(keys.update).not.toHaveBeenCalled();
  });

  it('PUT rejects wildcard and unknown permissions', async () => {
    actAs('client_admin');
    expect((await updateKey(signedRequest({ permissions: ['*'] }), params)).status).toBe(400);
    expect((await updateKey(signedRequest({ permissions: ['orders:delete'] }), params)).status).toBe(400);
    expect(keys.update).not.toHaveBeenCalled();
  });

  it('PUT updates validated permissions and never returns the stored key', async () => {
    actAs('client_admin');
    const response = await updateKey(signedRequest({ name: 'Renamed', permissions: ['courier-services:read'], isActive: false }), params);
    const body = await response.json();

    expect((keys.update as jest.Mock).mock.calls[0][0].data).toMatchObject({ name: 'Renamed', permissions: ['courier-services:read'], isActive: false });
    expect(body.apiKey).not.toHaveProperty('key');
  });

  it('PUT leaves permissions unchanged when none are sent, and accepts a null body', async () => {
    actAs('client_admin');
    await updateKey(signedRequest({ name: 'Renamed' }), params);
    expect((keys.update as jest.Mock).mock.calls[0][0].data).not.toHaveProperty('permissions');

    await updateKey(signedRequest(null), params);
    expect((keys.update as jest.Mock).mock.calls[1][0].data).not.toHaveProperty('name');
  });

  it("PUT returns 404 for another tenant's key", async () => {
    actAs('client_admin');
    (keys.findFirst as jest.Mock).mockResolvedValue(null);
    expect((await updateKey(signedRequest({ name: 'x' }), params)).status).toBe(404);
  });

  it('DELETE deactivates the key for client admins', async () => {
    actAs('client_admin');
    expect((await deleteKey(signedRequest(), params)).status).toBe(200);
    expect((keys.update as jest.Mock).mock.calls[0][0]).toMatchObject({ where: { id: 'key-1' }, data: { isActive: false } });
  });
});
