/**
 * POST /api/auth/refresh: exchanges the opaque refresh token issued at login
 * for a new access token and a rotated refresh token. Access tokens (JWTs) are
 * not accepted; the session must be active, unrevoked, and within its maximum
 * age; the user and client must be active.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
}));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { hashRefreshToken, SESSION_MAX_AGE_MS, signSessionToken } from '@/lib/session-tokens';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as refresh } from '@/app/api/auth/refresh/route';

const jwt = jest.requireActual('jsonwebtoken');
const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const SECRET = process.env.JWT_SECRET!;
const VERIFY = { issuer: 'scan2ship-saas', audience: 'scan2ship-users', algorithms: ['HS256'] };

const REFRESH_TOKEN = 'opaque-refresh-token-issued-at-login-0123456789';

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

function sessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'session-1',
    userId: USER.id,
    clientId: USER.clientId,
    refreshToken: hashRefreshToken(REFRESH_TOKEN),
    sessionToken: 'old-access-token',
    isActive: true,
    revokedAt: null,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    users: USER,
    ...overrides,
  };
}

function refreshRequest(body: unknown) {
  return { url: 'http://localhost/api/auth/refresh', json: async () => body } as unknown as NextRequest;
}

const findSession = () => prisma.sessions.findUnique as jest.Mock;
const rotate = () => prisma.sessions.updateMany as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (applySecurityMiddleware as jest.Mock).mockResolvedValue(null);
  findSession().mockResolvedValue(sessionRow());
  rotate().mockResolvedValue({ count: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('request validation', () => {
  it('applies the auth rate limit', async () => {
    const limited = { status: 429, json: async () => ({ error: 'Too many requests' }) };
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce(limited);
    expect(await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }))).toBe(limited);
    expect(applySecurityMiddleware).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ rateLimit: 'session' }));
    expect(findSession()).not.toHaveBeenCalled();
  });

  it.each([
    ['no body', null],
    ['no token', {}],
    ['a non-string token', { refreshToken: 12345 }],
  ])('requires a refresh token (%s)', async (_case, body) => {
    const response = await refresh(refreshRequest(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Refresh token is required' });
    expect(findSession()).not.toHaveBeenCalled();
  });

  it('looks the session up by the hash of the token, never the raw token', async () => {
    await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }));
    expect(findSession()).toHaveBeenCalledWith(
      expect.objectContaining({ where: { refreshToken: hashRefreshToken(REFRESH_TOKEN) } })
    );
  });
});

describe('rejections', () => {
  async function expectInvalid(body: unknown) {
    const response = await refresh(refreshRequest(body));
    expect(response.status).toBe(401);
    expect(rotate()).not.toHaveBeenCalled();
    return response;
  }

  it('does not accept an access token (JWT) as a refresh token', async () => {
    findSession().mockResolvedValue(null);
    const accessToken = signSessionToken(USER);
    await expectInvalid({ refreshToken: accessToken });
  });

  it('rejects an unknown refresh token', async () => {
    findSession().mockResolvedValue(null);
    const response = await expectInvalid({ refreshToken: 'unknown' });
    expect(await response.json()).toEqual({ error: 'Invalid refresh token' });
  });

  it('rejects a revoked session', async () => {
    findSession().mockResolvedValue(sessionRow({ isActive: false, revokedAt: new Date() }));
    await expectInvalid({ refreshToken: REFRESH_TOKEN });
  });

  it('rejects a session marked revoked even if still flagged active', async () => {
    findSession().mockResolvedValue(sessionRow({ revokedAt: new Date() }));
    await expectInvalid({ refreshToken: REFRESH_TOKEN });
  });

  it('rejects a session older than the maximum age', async () => {
    findSession().mockResolvedValue(sessionRow({ createdAt: new Date(Date.now() - SESSION_MAX_AGE_MS - 1000) }));
    await expectInvalid({ refreshToken: REFRESH_TOKEN });
  });

  it.each([
    ['the user is inactive', { ...USER, isActive: false }],
    ["the user's client is inactive", { ...USER, clients: { ...USER.clients, isActive: false } }],
    ['the user moved to another tenant', { ...USER, clientId: 'client-b' }],
  ])('rejects the refresh when %s', async (_case, users) => {
    findSession().mockResolvedValue(sessionRow({ users }));
    const response = await expectInvalid({ refreshToken: REFRESH_TOKEN });
    expect(await response.json()).toEqual({ error: 'User not found or inactive' });
  });

  it('rejects a token that a concurrent refresh already rotated', async () => {
    rotate().mockResolvedValue({ count: 0 });
    const response = await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }));
    expect(response.status).toBe(401);
  });
});

describe('successful refresh', () => {
  it('issues an 8h access token for the current role and tenant', async () => {
    findSession().mockResolvedValue(sessionRow({ users: { ...USER, role: 'client_admin' } }));
    const body = await (await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }))).json();

    const claims = jwt.verify(body.session.token, SECRET, VERIFY);
    expect(claims).toMatchObject({ userId: USER.id, clientId: USER.clientId, role: 'client_admin' });
    expect(claims.exp - claims.iat).toBe(8 * 60 * 60);
    expect(body.token).toBe(body.session.token);
  });

  it('rotates the refresh token and stores only its hash', async () => {
    const body = await (await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }))).json();

    expect(body.session.refreshToken).toEqual(expect.any(String));
    expect(body.session.refreshToken).not.toBe(REFRESH_TOKEN);
    expect(rotate()).toHaveBeenCalledWith({
      where: { id: 'session-1', refreshToken: hashRefreshToken(REFRESH_TOKEN), isActive: true },
      data: expect.objectContaining({
        sessionToken: body.session.token,
        refreshToken: hashRefreshToken(body.session.refreshToken),
        role: USER.role,
        expiresAt: expect.any(Date),
        lastActivity: expect.any(Date),
      }),
    });
  });

  it('never returns the password hash', async () => {
    const body = await (await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }))).json();
    expect(body.user).not.toHaveProperty('password');
    expect(JSON.stringify(body)).not.toContain(USER.password);
    expect(body.client).toEqual(USER.clients);
  });
});

describe('server errors', () => {
  it('returns a generic 500 when the database fails', async () => {
    findSession().mockRejectedValue(new Error('connection refused at 10.0.0.5'));
    const response = await refresh(refreshRequest({ refreshToken: REFRESH_TOKEN }));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
