jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  },
}));

// admin/users constructs its own client; route it to the same fake data
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => require('@/lib/prisma').prisma),
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { canAccessResource, UserRole } from '@/lib/auth-middleware';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import { GET as listUsers } from '@/app/api/admin/users/route';

const USERS = [
  { id: 'admin-a', clientId: 'client-a', email: 'admin@a.test', password: '$2a$12$hash-admin-a', role: 'client_admin' },
  { id: 'user-a', clientId: 'client-a', email: 'user@a.test', password: '$2a$12$hash-user-a', role: 'user' },
  { id: 'user-b', clientId: 'client-b', email: 'user@b.test', password: '$2a$12$hash-user-b', role: 'user' },
];

const findUser = prisma.users.findUnique as jest.Mock;
const findManyUsers = prisma.users.findMany as jest.Mock;

function withoutOmitted<T extends Record<string, unknown>>(row: T, omit?: Record<string, boolean>) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !omit?.[key]));
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  findManyUsers.mockImplementation(async ({ omit }) => USERS.map((row) => withoutOmitted(row, omit)));
  (prisma.users.count as jest.Mock).mockResolvedValue(USERS.length);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/admin/users', () => {
  it('does not return password hashes', async () => {
    findUser.mockResolvedValue(authUserRow('super_admin'));
    const response = await listUsers(
      Object.assign(signedRequest(), { url: 'http://localhost/api/admin/users' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.users).toHaveLength(3);
    expect(JSON.stringify(body)).not.toContain('$2a$12$');
    expect(body.users.every((user: Record<string, unknown>) => !('password' in user))).toBe(true);
  });

  it('is not available to tenant users', async () => {
    findUser.mockResolvedValue(authUserRow('client_admin'));
    const response = await listUsers(
      Object.assign(signedRequest(), { url: 'http://localhost/api/admin/users' })
    );

    expect(response.status).toBe(403);
    expect(findManyUsers).not.toHaveBeenCalled();
  });
});

describe('canAccessResource', () => {
  beforeEach(() => {
    findUser.mockImplementation(async ({ where }) => USERS.find((user) => user.id === where.id) ?? null);
  });

  it("lets a client admin access resources owned by their own tenant's users", async () => {
    expect(await canAccessResource('admin-a', 'user-a', UserRole.CLIENT_ADMIN)).toBe(true);
  });

  it("does not let a client admin access another tenant's resources", async () => {
    expect(await canAccessResource('admin-a', 'user-b', UserRole.CLIENT_ADMIN)).toBe(false);
  });

  it('limits other tenant roles to their own resources', async () => {
    expect(await canAccessResource('user-a', 'user-a', UserRole.USER)).toBe(true);
    expect(await canAccessResource('user-a', 'admin-a', UserRole.USER)).toBe(false);
    expect(await canAccessResource(TEST_USER_ID, 'user-a', UserRole.CHILD_USER)).toBe(false);
  });

  it('lets super admins access any resource', async () => {
    expect(await canAccessResource('admin-a', 'user-b', UserRole.SUPER_ADMIN)).toBe(true);
  });
});
