/**
 * POST /api/auth/refresh: rejects missing/invalid tokens and inactive
 * accounts, and issues a fresh login/refresh token pair without leaking the
 * password hash. Tokens are real JWTs signed with the test JWT_SECRET.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/jwt-secret-manager', () => ({
  jwtSecretManager: {
    getPrimarySecret: () => process.env.JWT_SECRET,
    getActiveSecrets: () => [process.env.JWT_SECRET],
  },
}));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as refresh } from '@/app/api/auth/refresh/route';

const jwt = jest.requireActual('jsonwebtoken');
const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const SECRET = process.env.JWT_SECRET!;
const VERIFY = { issuer: 'scan2ship-saas', audience: 'scan2ship-users', algorithms: ['HS256'] };

const USER = {
  id: 'user-1',
  email: 'user@client-a.test',
  name: 'Test User',
  password: '$2a$12$stored-hash',
  role: 'user',
  isActive: true,
  clientId: 'client-a',
  clients: { id: 'client-a', name: 'Client A', isActive: true },
};

function token(
  payload: Record<string, unknown> = { userId: USER.id },
  { secret = SECRET, issuer = 'scan2ship-saas', audience = 'scan2ship-users', expiresIn = '24h' as string | number } = {}
) {
  return jwt.sign(payload, secret, { issuer, audience, algorithm: 'HS256', expiresIn });
}

function refreshRequest(body: unknown) {
  return { url: 'http://localhost/api/auth/refresh', json: async () => body } as unknown as NextRequest;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(USER);
  (prisma.sessions.findFirst as jest.Mock).mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('token validation', () => {
  it('requires a refresh token', async () => {
    const response = await refresh(refreshRequest({}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Refresh token is required' });
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['a malformed token', () => 'not-a-jwt'],
    ['a token signed with another secret', () => token(undefined, { secret: 'another-secret-that-is-at-least-32-chars' })],
    ['a token from another issuer', () => token(undefined, { issuer: 'someone-else' })],
    ['a token for another audience', () => token(undefined, { audience: 'someone-else' })],
    ['an expired token', () => token(undefined, { expiresIn: -10 })],
    ['an unsigned token', () => jwt.sign({ userId: USER.id }, '', { algorithm: 'none', issuer: 'scan2ship-saas', audience: 'scan2ship-users' })],
  ])('rejects %s with 401', async (_case, makeToken) => {
    const response = await refresh(refreshRequest({ refreshToken: makeToken() }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Invalid refresh token' });
    expect(prisma.users.findUnique).not.toHaveBeenCalled();
  });
});

describe('account checks', () => {
  it('looks up the user named in the token', async () => {
    await refresh(refreshRequest({ refreshToken: token() }));
    expect(prisma.users.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: USER.id } }));
  });

  it.each([
    ['the user no longer exists', null],
    ['the user is inactive', { ...USER, isActive: false }],
    ["the user's client is inactive", { ...USER, clients: { ...USER.clients, isActive: false } }],
  ])('rejects the refresh when %s', async (_case, row) => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(row);
    const response = await refresh(refreshRequest({ refreshToken: token() }));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'User not found or inactive' });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('returns 500 when the database fails', async () => {
    (prisma.users.findUnique as jest.Mock).mockRejectedValue(new Error('connection refused'));
    const response = await refresh(refreshRequest({ refreshToken: token() }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});

describe('successful refresh', () => {
  it('issues a new 8h login token and 24h refresh token for the current role and tenant', async () => {
    // Claims come from the database row, not from the presented token.
    (prisma.users.findUnique as jest.Mock).mockResolvedValue({ ...USER, role: 'child_user' });
    const response = await refresh(refreshRequest({ refreshToken: token({ userId: USER.id, role: 'super_admin' }) }));
    const { session } = await response.json();

    expect(response.status).toBe(200);
    const login = jwt.verify(session.token, SECRET, VERIFY);
    const next = jwt.verify(session.refreshToken, SECRET, VERIFY);
    expect(login).toMatchObject({ userId: USER.id, clientId: 'client-a', email: USER.email, role: 'child_user' });
    expect(next).toMatchObject({ userId: USER.id, clientId: 'client-a', role: 'child_user' });
    expect(login.exp - login.iat).toBe(8 * 60 * 60);
    expect(next.exp - next.iat).toBe(24 * 60 * 60);
    expect(session).toMatchObject({ userId: USER.id, clientId: 'client-a', tokenInfo: { valid: true, isExpired: false } });
  });

  it('never returns the password hash', async () => {
    const body = await (await refresh(refreshRequest({ refreshToken: token() }))).json();
    expect(body.user).not.toHaveProperty('password');
    expect(JSON.stringify(body)).not.toContain(USER.password);
    expect(body.user).toMatchObject({ id: USER.id, email: USER.email, role: USER.role });
    expect(body.client).toEqual(USER.clients);
  });

  it("looks for the session within the user's own tenant", async () => {
    await refresh(refreshRequest({ refreshToken: token() }));
    expect(prisma.sessions.findFirst).toHaveBeenCalledWith({ where: { userId: USER.id, clientId: 'client-a' } });
    expect(prisma.sessions.update).not.toHaveBeenCalled();
  });

  it('stores the new login token on the existing session', async () => {
    (prisma.sessions.findFirst as jest.Mock).mockResolvedValue({ id: 'session-1', userId: USER.id, clientId: 'client-a' });
    const { session } = await (await refresh(refreshRequest({ refreshToken: token() }))).json();

    expect(session.id).toBe('session-1');
    expect(prisma.sessions.update).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      data: { sessionToken: session.token, expiresAt: expect.any(Date) },
    });
  });
});
