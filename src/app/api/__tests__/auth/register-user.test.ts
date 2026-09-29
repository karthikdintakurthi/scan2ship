/**
 * POST /api/auth/register-user: authenticated user provisioning.
 * Callers need CLIENT_ADMIN or higher, cannot grant a role above their own,
 * and tenant admins are confined to their own client.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as registerUser } from '@/app/api/auth/register-user/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

const NEW_USER = { name: 'New Person', email: 'new@client-a.test', password: 'plain-text-password' };
const HASH = '$2a$12$generated-hash';

function actAs(role: string, clientId = 'client-a', overrides: Record<string, unknown> = {}) {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue({ ...authUserRow(role, clientId), ...overrides });
}

const createdUsers = () => (prisma.users.create as jest.Mock).mock.calls.map(([args]) => args.data);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (applySecurityMiddleware as jest.Mock).mockResolvedValue(null);
  (bcrypt.hash as jest.Mock).mockResolvedValue(HASH);
  (prisma.clients.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
    ({
      'client-a': { id: 'client-a', isActive: true },
      'client-b': { id: 'client-b', isActive: true },
      'client-off': { id: 'client-off', isActive: false },
    })[where.id as string] ?? null
  );
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.users.create as jest.Mock).mockImplementation(async ({ data }) => data);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('authentication and role limits', () => {
  it('returns the security middleware response without authenticating', async () => {
    const limited = { status: 429, json: async () => ({ error: 'Too many requests' }) };
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce(limited);

    expect(await registerUser(signedRequest(NEW_USER))).toBe(limited);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without a token', async () => {
    const response = await registerUser(signedRequest(NEW_USER, { authenticated: false }));
    expect(response.status).toBe(401);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects a token for a user that no longer exists', async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(401);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects deactivated callers and callers from deactivated clients', async () => {
    actAs('client_admin', 'client-a', { isActive: false });
    expect((await registerUser(signedRequest(NEW_USER))).status).toBe(401);

    actAs('client_admin', 'client-a', { clients: { ...authUserRow('client_admin').clients, isActive: false } });
    expect((await registerUser(signedRequest(NEW_USER))).status).toBe(401);

    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['child_user', 'user', 'unknown_role'])('rejects %s callers with 403', async (role) => {
    actAs(role);
    const response = await registerUser(signedRequest({ ...NEW_USER, role: 'child_user' }));
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('keeps a client admin inside their own tenant', async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b' }));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'You can only create users in your own client account' });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['super_admin', 'master_admin'])('does not let a client admin grant %s', async (role) => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, role }));
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('does not let a super admin grant master_admin', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'master_admin' }));
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects unknown roles', async () => {
    actAs('master_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'admin' }));
    expect(response.status).toBe(400);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('requires platform admins to choose a tenant', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'clientId is required' });
  });
});

describe('input and tenant validation', () => {
  it.each([
    ['name', { email: NEW_USER.email, password: NEW_USER.password }],
    ['email', { name: NEW_USER.name, password: NEW_USER.password }],
    ['password', { name: NEW_USER.name, email: NEW_USER.email }],
  ])('rejects a request missing %s', async (_field, body) => {
    actAs('client_admin');
    const response = await registerUser(signedRequest(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Name, email, and password are required' });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('returns 404 for an unknown client', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-zzz' }));
    expect(response.status).toBe(404);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('refuses to add users to a deactivated client', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-off' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Client account is deactivated' });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects a duplicate email within the tenant', async () => {
    actAs('client_admin');
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ id: 'existing', email: NEW_USER.email, clientId: 'client-a' });
    const response = await registerUser(signedRequest(NEW_USER));

    expect(response.status).toBe(409);
    expect(prisma.users.findFirst).toHaveBeenCalledWith({ where: { email: NEW_USER.email, clientId: 'client-a' } });
    expect(prisma.writeCalls()).toEqual([]);
  });
});

describe('successful registration', () => {
  it('creates the user in the caller tenant with a bcrypt hash and the default role', async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest(NEW_USER));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(bcrypt.hash).toHaveBeenCalledWith(NEW_USER.password, 12);
    expect(createdUsers()).toEqual([
      expect.objectContaining({
        email: NEW_USER.email,
        name: NEW_USER.name,
        password: HASH,
        role: 'user',
        clientId: 'client-a',
        createdBy: TEST_USER_ID,
        isActive: true,
      }),
    ]);
    expect(body).toEqual({
      message: 'User registered successfully',
      user: { id: expect.any(String), name: NEW_USER.name, email: NEW_USER.email, role: 'user', clientId: 'client-a' },
    });
  });

  it('never stores or returns the plain-text password or its hash', async () => {
    actAs('client_admin');
    const body = await (await registerUser(signedRequest(NEW_USER))).json();

    expect(JSON.stringify(createdUsers())).not.toContain(NEW_USER.password);
    expect(JSON.stringify(body)).not.toContain(HASH);
    expect(JSON.stringify(body)).not.toContain(NEW_USER.password);
  });

  it('lets a client admin create another client admin in their tenant', async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-a', role: 'client_admin' }));
    expect(response.status).toBe(200);
    expect(createdUsers()[0]).toMatchObject({ clientId: 'client-a', role: 'client_admin' });
  });

  it('lets a master admin create a super admin in any tenant', async () => {
    actAs('master_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'super_admin' }));
    expect(response.status).toBe(200);
    expect(createdUsers()[0]).toMatchObject({ clientId: 'client-b', role: 'super_admin', createdBy: TEST_USER_ID });
  });

  it('creates missing default pickup locations and courier services for the tenant only', async () => {
    actAs('client_admin');
    (prisma.pickup_locations.findFirst as jest.Mock).mockImplementation(async ({ where }) =>
      where.value === 'main-warehouse' ? { id: 'existing' } : null
    );
    (prisma.courier_services.findFirst as jest.Mock).mockImplementation(async ({ where }) =>
      where.code === 'manual' ? { id: 'existing' } : null
    );

    await registerUser(signedRequest(NEW_USER));

    const pickups = (prisma.pickup_locations.create as jest.Mock).mock.calls.map(([a]) => a.data);
    const couriers = (prisma.courier_services.create as jest.Mock).mock.calls.map(([a]) => a.data);
    expect(pickups).toEqual([expect.objectContaining({ clientId: 'client-a', value: 'branch-office' })]);
    expect(couriers.map((c) => c.code)).toEqual(['delhivery', 'dtdc', 'india_post']);
    expect(couriers.every((c) => c.clientId === 'client-a')).toBe(true);
  });

  it('still succeeds when creating a default pickup location fails', async () => {
    actAs('client_admin');
    (prisma.pickup_locations.create as jest.Mock).mockRejectedValue(new Error('unique constraint'));
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(200);
  });

  it('returns 500 when creating the user fails', async () => {
    actAs('client_admin');
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error('db down'));
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
