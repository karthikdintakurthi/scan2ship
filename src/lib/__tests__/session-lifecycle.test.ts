/**
 * Website sessions: a token only works while its session is live, a user can be
 * signed in on several devices at once, logout ends one device's session, and
 * password changes, admin resets, and deactivation end sessions.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
// Routes that construct their own client share the same fake data
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import bcrypt from 'bcryptjs';
import { prisma as realPrisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-middleware';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { signSessionToken } from '@/lib/session-tokens';
import { authUserRow, liveSessionFor, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as logout } from '@/app/api/auth/logout/route';
import { GET as verify } from '@/app/api/auth/verify/route';
import { PUT as changePassword } from '@/app/api/users/change-password/route';
import { PUT as adminResetPassword } from '@/app/api/admin/users/[id]/update-password/route';
import { PUT as updateUser } from '@/app/api/users/[id]/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const findSession = () => prisma.sessions.findUnique as jest.Mock;
const HOUR = 60 * 60 * 1000;

function requestWith(token: string, body: unknown = {}, url = 'http://localhost/api/test') {
  return {
    url,
    nextUrl: new URL(url),
    headers: { get: (name: string) => (name.toLowerCase() === 'authorization' ? `Bearer ${token}` : null) },
    cookies: { get: () => undefined },
    json: async () => body,
  } as never;
}

function session(overrides: Record<string, unknown> = {}) {
  return { id: 'session-1', userId: TEST_USER_ID, isActive: true, revokedAt: null, expiresAt: new Date(Date.now() + HOUR), ...overrides };
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('user'));
  findSession().mockImplementation(liveSessionFor);
  (prisma.sessions.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
});

afterEach(() => jest.restoreAllMocks());

describe('getAuthenticatedUser session check', () => {
  it('accepts a token whose session is live and reports the session id', async () => {
    findSession().mockResolvedValue(session());
    const user = await getAuthenticatedUser(signedRequest());
    expect(user).toMatchObject({ id: TEST_USER_ID, sessionId: 'session-1' });
    expect(findSession()).toHaveBeenCalledWith(expect.objectContaining({ where: { sessionToken: expect.any(String) } }));
  });

  it.each([
    ['has no session (never issued by login, or deleted)', null],
    ['belongs to a logged-out session', session({ isActive: false, revokedAt: new Date() })],
    ['belongs to a revoked session', session({ revokedAt: new Date() })],
    ['belongs to an expired session', session({ expiresAt: new Date(Date.now() - 1000) })],
    ["belongs to another user's session", session({ userId: 'someone-else' })],
  ])('rejects a validly signed token that %s', async (_case, row) => {
    findSession().mockResolvedValue(row);
    expect(await getAuthenticatedUser(signedRequest())).toBeNull();
  });

  it('lets the same user be signed in on two devices at once', async () => {
    const user = { id: TEST_USER_ID, clientId: 'client-a', email: 'user@client-a.test', role: 'user' };
    // Signed in the same second: tokens must still differ, as each keys its own session
    const laptop = signSessionToken(user);
    const phone = signSessionToken(user);
    expect(laptop).not.toBe(phone);

    const sessions: Record<string, ReturnType<typeof session>> = {
      [laptop]: session({ id: 'laptop' }),
      [phone]: session({ id: 'phone' }),
    };
    findSession().mockImplementation(async ({ where }) => sessions[where.sessionToken] ?? null);

    expect(await getAuthenticatedUser(requestWith(laptop))).toMatchObject({ sessionId: 'laptop' });
    expect(await getAuthenticatedUser(requestWith(phone))).toMatchObject({ sessionId: 'phone' });
  });
});

describe('POST /api/auth/logout', () => {
  it("ends only the presented token's session", async () => {
    const response = await logout(requestWith('token-on-this-device'));
    expect(response.status).toBe(200);
    // Uses the ordinary per-user limit, not the strict sign-in limit
    expect(applySecurityMiddleware).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ rateLimit: 'api' }));
    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { sessionToken: 'token-on-this-device', isActive: true },
      data: { isActive: false, revokedAt: expect.any(Date) },
    });
  });

  it('answers 200 without a token and changes nothing', async () => {
    const request = { headers: { get: () => null } } as never;
    expect((await logout(request)).status).toBe(200);
    expect(prisma.sessions.updateMany).not.toHaveBeenCalled();
  });

  it('reports a failure so the user can retry', async () => {
    (prisma.sessions.updateMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await logout(requestWith('t'))).status).toBe(500);
  });
});

describe('GET /api/auth/verify', () => {
  it('reports a logged-out token as signed out', async () => {
    findSession().mockResolvedValue(session({ isActive: false, revokedAt: new Date() }));
    expect((await verify(signedRequest())).status).toBe(401);
  });

  it('returns the real session for a live token, without the password hash', async () => {
    const expiresAt = new Date(Date.now() + 5 * HOUR);
    findSession().mockImplementation(async ({ where }) =>
      where.sessionToken ? session() : { id: 'session-1', expiresAt }
    );
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ ...authUserRow('user'), password: '$2a$hash' });

    const response = await verify(signedRequest());
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.session).toMatchObject({ id: 'session-1', userId: TEST_USER_ID, expiresAt });
    expect(JSON.stringify(body)).not.toContain('$2a$hash');
  });
});

describe('credential changes end sessions', () => {
  it("changing your own password signs out your other devices but keeps this one", async () => {
    findSession().mockResolvedValue(session({ id: 'this-device' }));
    (prisma.users.findUnique as jest.Mock).mockImplementation(async (args) =>
      args.select?.password ? { id: TEST_USER_ID, email: 'user@client-a.test', name: 'U', password: '$2a$old' } : authUserRow('user')
    );
    (bcrypt.compare as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    const response = await changePassword(
      signedRequest({ currentPassword: 'old-password', newPassword: 'N3w-Passw0rd!long' })
    );
    expect(response.status).toBe(200);
    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { userId: TEST_USER_ID, isActive: true, id: { not: 'this-device' } },
      data: { isActive: false, revokedAt: expect.any(Date) },
    });
  });

  it("an admin password reset ends every session the user had", async () => {
    (prisma.users.findUnique as jest.Mock).mockImplementation(async ({ where }) =>
      where.id === TEST_USER_ID ? authUserRow('super_admin') : { id: 'target-user', email: 't@x.test', name: 'T', clientId: 'client-a', clients: {} }
    );
    const response = await adminResetPassword(signedRequest({ newPassword: 'reset-password-123' }), params('target-user'));
    expect(response.status).toBe(200);
    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target-user', isActive: true },
      data: { isActive: false, revokedAt: expect.any(Date) },
    });
  });

  it('deactivating a user ends their sessions', async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('master_admin'));
    (prisma.users.update as jest.Mock).mockResolvedValue({ id: 'target-user' });
    await updateUser(
      signedRequest({ email: 't@x.test', name: 'T', role: 'user', isActive: false }),
      params('target-user')
    );
    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { userId: 'target-user', isActive: true },
      data: { isActive: false, revokedAt: expect.any(Date) },
    });
  });

  it('editing a user without changing password or status leaves sessions alone', async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('master_admin'));
    (prisma.users.update as jest.Mock).mockResolvedValue({ id: 'target-user' });
    await updateUser(signedRequest({ email: 't@x.test', name: 'Renamed', role: 'user', isActive: true }), params('target-user'));
    expect(prisma.sessions.updateMany).not.toHaveBeenCalled();
  });
});
