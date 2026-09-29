jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import fs from 'node:fs';
import bcrypt from 'bcryptjs';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { resolveUserProvisioning } from '@/lib/application/user-provisioning';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as registerUser } from '@/app/api/auth/register-user/route';
import { POST as adminCreateUser } from '@/app/api/admin/users/route';

jest.unmock('path');
const { join } = jest.requireActual('path');

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

function creator(role: UserRole, clientId = 'client-a'): AuthenticatedUser {
  return {
    id: TEST_USER_ID,
    email: 'creator@test',
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

describe('resolveUserProvisioning', () => {
  describe('tenant admins', () => {
    const admin = creator(UserRole.CLIENT_ADMIN);

    it('create users in their own tenant, defaulting to the user role', () => {
      expect(resolveUserProvisioning(admin, {})).toEqual({ ok: true, clientId: 'client-a', role: 'user' });
      expect(resolveUserProvisioning(admin, { clientId: '' })).toEqual({ ok: true, clientId: 'client-a', role: 'user' });
      expect(resolveUserProvisioning(admin, { clientId: 'client-a', role: 'child_user' })).toEqual({ ok: true, clientId: 'client-a', role: 'child_user' });
    });

    it('may create other client admins', () => {
      expect(resolveUserProvisioning(admin, { role: 'client_admin' })).toMatchObject({ ok: true, role: 'client_admin' });
    });

    it('cannot target another tenant', () => {
      expect(resolveUserProvisioning(admin, { clientId: 'client-b' })).toMatchObject({ ok: false, status: 403 });
    });

    it.each(['super_admin', 'master_admin'])('cannot grant %s', (role) => {
      expect(resolveUserProvisioning(admin, { role })).toMatchObject({ ok: false, status: 403 });
    });
  });

  describe('platform admins', () => {
    it('must choose a tenant', () => {
      expect(resolveUserProvisioning(creator(UserRole.SUPER_ADMIN), {})).toMatchObject({ ok: false, status: 400 });
    });

    it('may create users in any tenant', () => {
      expect(resolveUserProvisioning(creator(UserRole.SUPER_ADMIN), { clientId: 'client-b', role: 'client_admin' })).toEqual({
        ok: true,
        clientId: 'client-b',
        role: 'client_admin',
      });
    });

    it('cannot grant a role above their own', () => {
      expect(resolveUserProvisioning(creator(UserRole.SUPER_ADMIN), { clientId: 'client-b', role: 'master_admin' })).toMatchObject({ ok: false, status: 403 });
      expect(resolveUserProvisioning(creator(UserRole.MASTER_ADMIN), { clientId: 'client-b', role: 'master_admin' })).toMatchObject({ ok: true });
    });
  });

  it.each(['admin', 'viewer', 'toString', '', 42])('rejects the invalid role %p', (role) => {
    expect(resolveUserProvisioning(creator(UserRole.MASTER_ADMIN), { clientId: 'client-b', role })).toMatchObject({ ok: false, status: 400 });
  });

  it('treats a null role like an omitted one', () => {
    expect(resolveUserProvisioning(creator(UserRole.CLIENT_ADMIN), { role: null })).toMatchObject({ ok: true, role: 'user' });
  });

  it('rejects a non-string clientId', () => {
    expect(resolveUserProvisioning(creator(UserRole.MASTER_ADMIN), { clientId: { not: null } })).toMatchObject({ ok: false, status: 400 });
    expect(resolveUserProvisioning(creator(UserRole.CLIENT_ADMIN), { clientId: ['client-a'] })).toMatchObject({ ok: false, status: 400 });
  });

  it('keeps lower roles from granting roles above their own', () => {
    expect(resolveUserProvisioning(creator(UserRole.USER), { role: 'client_admin' })).toMatchObject({ ok: false, status: 403 });
    expect(resolveUserProvisioning(creator(UserRole.CHILD_USER), { role: 'user' })).toMatchObject({ ok: false, status: 403 });
  });
});

const NEW_USER = { name: 'New Person', email: 'new@client.test', password: 'Str0ng!Passw0rd' };

function actAs(role: string, clientId = 'client-a') {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role, clientId));
}

function createdUsers() {
  return (prisma.users.create as jest.Mock).mock.calls.map(([args]) => args.data);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (bcrypt.hash as jest.Mock).mockResolvedValue('bcrypt-hash');
  (prisma.clients.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
    ['client-a', 'client-b'].includes(where.id) ? { id: where.id, isActive: true, companyName: where.id } : null
  );
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.users.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, clients: null }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/auth/register-user', () => {
  it('rejects unauthenticated callers without creating anything', async () => {
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-a', role: 'client_admin' }, { authenticated: false }));
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['child_user', 'user'])('rejects %s callers', async (role) => {
    actAs(role);
    const response = await registerUser(signedRequest({ ...NEW_USER, role: 'child_user' }));
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it("creates the user in a client admin's own tenant and records the creator", async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, role: 'child_user' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(createdUsers()).toEqual([
      expect.objectContaining({ email: NEW_USER.email, clientId: 'client-a', role: 'child_user', createdBy: TEST_USER_ID, password: 'bcrypt-hash' }),
    ]);
    expect(bcrypt.hash).toHaveBeenCalledWith(NEW_USER.password, 12);
    expect(JSON.stringify(body)).not.toContain('bcrypt-hash');
    expect(body.user).toMatchObject({ clientId: 'client-a', role: 'child_user' });
  });

  it('does not let a client admin create a user in another tenant', async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b' }));
    expect(response.status).toBe(403);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it.each(['super_admin', 'master_admin', 'admin'])('does not let a client admin grant %s', async (role) => {
    actAs('client_admin');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-a', role }));
    expect([400, 403]).toContain(response.status);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('lets a platform admin create a user in a chosen tenant', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'client_admin' }));
    expect(response.status).toBe(200);
    expect(createdUsers()[0]).toMatchObject({ clientId: 'client-b', role: 'client_admin' });
  });

  it('still sets up default pickup locations and courier services for the tenant', async () => {
    actAs('client_admin');
    await registerUser(signedRequest(NEW_USER));
    const pickups = (prisma.pickup_locations.create as jest.Mock).mock.calls.map(([args]) => args.data.clientId);
    const couriers = (prisma.courier_services.create as jest.Mock).mock.calls.map(([args]) => args.data.clientId);
    expect(pickups).toEqual(['client-a', 'client-a']);
    expect(couriers).toEqual(['client-a', 'client-a', 'client-a', 'client-a']);
  });

  it.each([
    ['name', { email: 'a@b.c', password: 'x' }],
    ['email', { name: 'A', password: 'x' }],
    ['password', { name: 'A', email: 'a@b.c' }],
  ])('rejects a request missing %s', async (_field, body) => {
    actAs('client_admin');
    const response = await registerUser(signedRequest(body));
    expect(response.status).toBe(400);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('rejects a null body', async () => {
    actAs('client_admin');
    const response = await registerUser(signedRequest(null));
    expect(response.status).toBe(400);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('returns 404 when the tenant does not exist', async () => {
    actAs('super_admin', 'platform');
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-missing' }));
    expect(response.status).toBe(404);
  });

  it('rejects a deactivated tenant', async () => {
    actAs('super_admin', 'platform');
    (prisma.clients.findUnique as jest.Mock).mockResolvedValue({ id: 'client-b', isActive: false });
    const response = await registerUser(signedRequest({ ...NEW_USER, clientId: 'client-b' }));
    expect(response.status).toBe(400);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('rejects a duplicate email in the same tenant', async () => {
    actAs('client_admin');
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(409);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('returns the security middleware response before authenticating', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(429);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('uses the stricter auth rate limit', async () => {
    actAs('client_admin');
    await registerUser(signedRequest(NEW_USER));
    expect((applySecurityMiddleware as jest.Mock).mock.calls[0][2]).toMatchObject({ rateLimit: 'auth' });
  });

  it('returns 500 when user creation fails', async () => {
    actAs('client_admin');
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error('unique violation'));
    const response = await registerUser(signedRequest(NEW_USER));
    expect(response.status).toBe(500);
  });
});

describe('POST /api/admin/users', () => {
  it('does not let a super admin create a master admin', async () => {
    actAs('super_admin', 'platform');
    const response = await adminCreateUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'master_admin' }));
    expect(response.status).toBe(403);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('rejects roles that do not exist', async () => {
    actAs('master_admin', 'platform');
    const response = await adminCreateUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'admin' }));
    expect(response.status).toBe(400);
    expect(prisma.users.create).not.toHaveBeenCalled();
  });

  it('creates the user with the validated tenant and role and records the creator', async () => {
    actAs('super_admin', 'platform');
    const response = await adminCreateUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'client_admin' }));
    expect(response.status).toBe(201);
    expect(createdUsers()[0]).toMatchObject({ clientId: 'client-b', role: 'client_admin', createdBy: TEST_USER_ID });
  });

  it('lets a master admin create another master admin', async () => {
    actAs('master_admin', 'platform');
    const response = await adminCreateUser(signedRequest({ ...NEW_USER, clientId: 'client-b', role: 'master_admin' }));
    expect(response.status).toBe(201);
  });
});

describe('add-user UI', () => {
  const read = (file: string) => fs.readFileSync(join(__dirname, '..', '..', file), 'utf8');

  it('registerUser sends the auth token', () => {
    const context = read('contexts/AuthContext.tsx');
    const start = context.indexOf('const registerUser = async');
    const registerUserSource = context.slice(start, context.indexOf('const refreshSession', start));
    expect(registerUserSource).toContain("'/api/auth/register-user'");
    expect(registerUserSource).toMatch(/'Authorization': `Bearer \$\{getStoredToken\(\)\}`/);
  });

  it('offers only roles that exist', () => {
    const page = read('app/admin/add-user/page.tsx');
    const offered = [...page.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]);
    expect(offered.length).toBeGreaterThan(0);
    expect(offered.filter((role) => !Object.values(UserRole).includes(role as UserRole))).toEqual([]);
  });
});
