/**
 * /api/admin/users: platform-level user listing and creation. Both handlers
 * require SUPER_ADMIN or higher; password hashes must never be returned.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
// The route constructs its own PrismaClient; route it to the same mock.
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';
import { GET as listUsers, POST as createUser } from '@/app/api/admin/users/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

const USERS = [
  { id: 'admin-a', clientId: 'client-a', email: 'admin@a.test', password: '$2a$12$hash-admin-a', role: 'client_admin' },
  { id: 'user-a', clientId: 'client-a', email: 'user@a.test', password: '$2a$12$hash-user-a', role: 'user' },
  { id: 'user-b', clientId: 'client-b', email: 'user@b.test', password: '$2a$12$hash-user-b', role: 'user' },
];
const HASH = '$2a$12$new-user-hash';
const NEW_USER = { name: 'New Admin', email: 'new@b.test', password: 'plain-text-password', role: 'client_admin', clientId: 'client-b' };

function actAs(role: string, clientId = 'platform') {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role, clientId));
}

const get = (query = '', authenticated = true) =>
  listUsers(signedRequest({}, { authenticated, url: `http://localhost/api/admin/users${query}` }));
const post = (body: unknown, authenticated = true) =>
  createUser(signedRequest(body, { authenticated, url: 'http://localhost/api/admin/users' }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (applySecurityMiddleware as jest.Mock).mockResolvedValue(null);
  (bcrypt.hash as jest.Mock).mockResolvedValue(HASH);

  (prisma.users.findMany as jest.Mock).mockImplementation(async ({ where, omit, skip = 0, take }) =>
    USERS.filter((row) => matchesWhere(row, where))
      .slice(skip, take === undefined ? undefined : skip + take)
      .map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => !omit?.[key])))
  );
  (prisma.users.count as jest.Mock).mockImplementation(async ({ where }) => USERS.filter((row) => matchesWhere(row, where)).length);
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.clients.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
    ['client-a', 'client-b'].includes(where.id) ? { id: where.id, companyName: `Company ${where.id}`, name: where.id } : null
  );
  (prisma.users.create as jest.Mock).mockImplementation(async ({ data }) => ({
    ...data,
    clients: { id: data.clientId, companyName: `Company ${data.clientId}`, name: data.clientId },
  }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/admin/users', () => {
  it('returns the security middleware response without authenticating', async () => {
    const limited = { status: 429, json: async () => ({ error: 'Too many requests' }) };
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce(limited);
    expect(await get()).toBe(limited);
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    const response = await get('', false);
    expect(response.status).toBe(401);
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it.each(['child_user', 'user', 'client_admin'])('rejects %s callers with 403', async (role) => {
    actAs(role, 'client-a');
    const response = await get();
    expect(response.status).toBe(403);
    expect(prisma.users.findMany).not.toHaveBeenCalled();
  });

  it.each(['super_admin', 'master_admin'])('lists users across tenants for %s', async (role) => {
    actAs(role);
    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users.map((u: { id: string }) => u.id)).toEqual(['admin-a', 'user-a', 'user-b']);
    expect(body.pagination).toEqual({ page: 1, limit: 10, total: 3, pages: 1 });
  });

  it('never returns password hashes', async () => {
    actAs('super_admin');
    const body = await (await get()).json();

    expect(prisma.users.findMany).toHaveBeenCalledWith(expect.objectContaining({ omit: { password: true } }));
    for (const user of body.users) expect(user).not.toHaveProperty('password');
    expect(JSON.stringify(body)).not.toContain('$2a$12$');
  });

  it('filters by clientId and paginates', async () => {
    actAs('super_admin');
    const body = await (await get('?clientId=client-a&page=2&limit=1')).json();

    expect(prisma.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { clientId: 'client-a' }, skip: 1, take: 1, orderBy: { createdAt: 'desc' } })
    );
    expect(prisma.users.count).toHaveBeenCalledWith({ where: { clientId: 'client-a' } });
    expect(body.users.map((u: { id: string }) => u.id)).toEqual(['user-a']);
    expect(body.pagination).toEqual({ page: 2, limit: 1, total: 2, pages: 2 });
  });

  it('returns 500 when the query fails', async () => {
    actAs('super_admin');
    (prisma.users.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    const response = await get();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to fetch users' });
  });
});

describe('POST /api/admin/users', () => {
  it('rejects unauthenticated requests', async () => {
    const response = await post(NEW_USER, false);
    expect(response.status).toBe(401);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['child_user', 'user', 'client_admin'])('rejects %s callers with 403, even for their own tenant', async (role) => {
    actAs(role, 'client-b');
    const response = await post(NEW_USER);
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['name', 'email', 'password', 'role', 'clientId'])('rejects a request missing %s', async (field) => {
    actAs('super_admin');
    const response = await post({ ...NEW_USER, [field]: '' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: `Missing required field: ${field}` });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('does not let a super admin grant master_admin', async () => {
    actAs('super_admin');
    const response = await post({ ...NEW_USER, role: 'master_admin' });
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects unknown roles', async () => {
    actAs('master_admin');
    const response = await post({ ...NEW_USER, role: 'admin' });
    expect(response.status).toBe(400);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects a duplicate email within the target tenant', async () => {
    actAs('super_admin');
    (prisma.users.findFirst as jest.Mock).mockResolvedValue(USERS[2]);
    const response = await post({ ...NEW_USER, email: 'user@b.test' });

    expect(response.status).toBe(409);
    expect(prisma.users.findFirst).toHaveBeenCalledWith({ where: { email: 'user@b.test', clientId: 'client-b' } });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('returns 404 for an unknown client', async () => {
    actAs('super_admin');
    const response = await post({ ...NEW_USER, clientId: 'client-zzz' });
    expect(response.status).toBe(404);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('creates the user with a bcrypt hash and records the creator', async () => {
    actAs('super_admin');
    const response = await post(NEW_USER);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith(NEW_USER.password, 12);
    expect((prisma.users.create as jest.Mock).mock.calls[0][0].data).toMatchObject({
      name: NEW_USER.name,
      email: NEW_USER.email,
      password: HASH,
      role: 'client_admin',
      clientId: 'client-b',
      createdBy: TEST_USER_ID,
      isActive: true,
    });
    expect(body.message).toBe('User created successfully');
    expect(body.user).toMatchObject({ email: NEW_USER.email, role: 'client_admin', clientId: 'client-b' });
  });

  it('never returns the password hash or the plain-text password', async () => {
    actAs('super_admin');
    const body = await (await post(NEW_USER)).json();

    expect(body.user).not.toHaveProperty('password');
    expect(JSON.stringify(body)).not.toContain(HASH);
    expect(JSON.stringify(body)).not.toContain(NEW_USER.password);
  });

  it('honours an explicit isActive flag', async () => {
    actAs('super_admin');
    await post({ ...NEW_USER, isActive: false });
    expect((prisma.users.create as jest.Mock).mock.calls[0][0].data.isActive).toBe(false);
  });

  it('lets a master admin create a super admin', async () => {
    actAs('master_admin');
    const response = await post({ ...NEW_USER, role: 'super_admin' });
    expect(response.status).toBe(201);
    expect((prisma.users.create as jest.Mock).mock.calls[0][0].data.role).toBe('super_admin');
  });

  it('returns 500 when creating the user fails', async () => {
    actAs('super_admin');
    (prisma.users.create as jest.Mock).mockRejectedValue(new Error('db down'));
    const response = await post(NEW_USER);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to create user' });
  });
});
