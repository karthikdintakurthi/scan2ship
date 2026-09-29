/**
 * POST /api/auth/login: input validation, credential checks, JWT issuance and
 * session bookkeeping. Prisma is an in-memory mock; tokens are real JWTs.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  ...jest.requireActual('@/lib/security-middleware'),
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
}));

import type { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as login } from '@/app/api/auth/login/route';
import { hashRefreshToken } from '@/lib/session-tokens';

const jwt = jest.requireActual('jsonwebtoken');
const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const SECRET = process.env.JWT_SECRET!;

const USER = {
  id: 'user-1',
  email: 'user@client-a.test',
  name: 'Test User',
  password: '$2a$12$stored-hash',
  role: 'client_admin',
  isActive: true,
  clientId: 'client-a',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  clients: { id: 'client-a', name: 'Client A', isActive: true },
};

function loginRequest(body: unknown, { invalidJson = false, headers = {} as Record<string, string> } = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    url: 'http://localhost/api/auth/login',
    headers: { get: (name: string) => lower[name.toLowerCase()] ?? null },
    json: async () => {
      if (invalidJson) throw new SyntaxError('Unexpected token');
      return body;
    },
  } as unknown as NextRequest;
}

const VALID = { email: USER.email, password: 'correct-password' };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  (applySecurityMiddleware as jest.Mock).mockResolvedValue(null);
  (prisma.users.findFirst as jest.Mock).mockResolvedValue(USER);
  (prisma.sessions.create as jest.Mock).mockImplementation(async ({ data }) => data);
  (bcrypt.compare as jest.Mock).mockResolvedValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env.JWT_SECRET = SECRET;
});

describe('request validation', () => {
  it('returns the security middleware response (e.g. rate limiting) without touching the database', async () => {
    const limited = { status: 429, json: async () => ({ error: 'Too many requests' }) };
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce(limited);

    const response = await login(loginRequest(VALID));

    expect(response).toBe(limited);
    expect(applySecurityMiddleware).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ rateLimit: 'auth' }));
    expect(prisma.users.findFirst).not.toHaveBeenCalled();
  });

  it('rejects malformed JSON', async () => {
    const response = await login(loginRequest(null, { invalidJson: true }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON in request body' });
  });

  it.each([
    ['missing email', { password: 'correct-password' }, 'This field is required'],
    ['malformed email', { email: 'not-an-email', password: 'correct-password' }, 'Invalid email format'],
    ['non-string email', { email: ['a@b.co'], password: 'correct-password' }, 'Value must be a string'],
    ['missing password', { email: USER.email }, 'Password is required'],
    ['non-string password', { email: USER.email, password: 12345678 }, 'Password is required'],
  ])('rejects a %s with 400', async (_case, body, error) => {
    const response = await login(loginRequest(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error });
    expect(prisma.users.findFirst).not.toHaveBeenCalled();
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('looks the user up by email without regard to case, among active users only', async () => {
    await login(loginRequest({ email: 'USER@Client-A.test', password: 'correct-password' }));
    expect(prisma.users.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: { equals: 'user@client-a.test', mode: 'insensitive' }, isActive: true } })
    );
  });

  it('compares the password exactly as typed, without trimming or stripping', async () => {
    const typed = '  pass onload=word javascript:\t ';
    await login(loginRequest({ email: USER.email, password: typed }));
    expect(bcrypt.compare).toHaveBeenCalledWith(typed, USER.password);
  });

  it('accepts passwords shorter than the current policy, which applies when a password is set', async () => {
    await login(loginRequest({ email: USER.email, password: 'short' }));
    expect(bcrypt.compare).toHaveBeenCalledWith('short', USER.password);
  });

  it('rejects an overlong password as a failed login without checking it', async () => {
    const response = await login(loginRequest({ email: USER.email, password: 'x'.repeat(129) }));
    expect(response.status).toBe(401);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });
});

describe('authentication failures', () => {
  async function expectRejected(body: unknown, error = 'Invalid email or password') {
    const response = await login(loginRequest(body));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error });
    expect(prisma.writeCalls()).toEqual([]);
  }

  it('rejects an unknown email without checking a password', async () => {
    (prisma.users.findFirst as jest.Mock).mockResolvedValue(null);
    await expectRejected(VALID);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects an inactive user', async () => {
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ ...USER, isActive: false });
    await expectRejected(VALID);
  });

  it('rejects a user whose client is inactive or missing', async () => {
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ ...USER, clients: { ...USER.clients, isActive: false } });
    await expectRejected(VALID, 'Client account is inactive');

    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ ...USER, clients: null });
    await expectRejected(VALID, 'Client account is inactive');
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects a user with no password set', async () => {
    (prisma.users.findFirst as jest.Mock).mockResolvedValue({ ...USER, password: null });
    await expectRejected(VALID);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects a wrong password with the same message as an unknown email', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);
    await expectRejected({ ...VALID, password: 'wrong-password' });
    expect(bcrypt.compare).toHaveBeenCalledWith('wrong-password', USER.password);
  });
});

describe('successful login', () => {
  it('issues an 8h HS256 token bound to the user, client and role', async () => {
    const response = await login(loginRequest(VALID));
    const body = await response.json();

    expect(response.status).toBe(200);
    const claims = jwt.verify(body.session.token, SECRET, {
      issuer: 'scan2ship-saas',
      audience: 'scan2ship-users',
      algorithms: ['HS256'],
    });
    expect(claims).toMatchObject({ userId: USER.id, clientId: USER.clientId, email: USER.email, role: USER.role });
    expect(claims.exp - claims.iat).toBe(8 * 60 * 60);
  });

  it('never returns the password hash', async () => {
    const body = await (await login(loginRequest(VALID))).json();

    expect(body.user).not.toHaveProperty('password');
    expect(JSON.stringify(body)).not.toContain(USER.password);
    expect(body.user).toMatchObject({ id: USER.id, email: USER.email, role: USER.role, clientId: USER.clientId });
    expect(body.client).toEqual(USER.clients);
  });

  it('revokes earlier active sessions and records a new one holding the issued token', async () => {
    const response = await login(
      loginRequest(VALID, { headers: { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'jest-agent' } })
    );
    const body = await response.json();

    expect(prisma.sessions.updateMany).toHaveBeenCalledWith({
      where: { userId: USER.id, isActive: true },
      data: { isActive: false, revokedAt: expect.any(Date) },
    });
    const [[{ data }]] = (prisma.sessions.create as jest.Mock).mock.calls;
    expect(data).toMatchObject({
      userId: USER.id,
      clientId: USER.clientId,
      sessionToken: body.session.token,
      ipAddress: '203.0.113.9',
      userAgent: 'jest-agent',
      role: USER.role,
      isActive: true,
    });
    // The browser gets an opaque refresh token; the session stores only its hash
    expect(body.session.refreshToken).toEqual(expect.any(String));
    expect(body.session.refreshToken.length).toBeGreaterThanOrEqual(40);
    expect(data.refreshToken).toBe(hashRefreshToken(body.session.refreshToken));
    expect(data.refreshToken).not.toContain(body.session.refreshToken);
    expect(new Date(body.session.expiresAt).getTime()).toBe(data.expiresAt.getTime());
  });

  it('falls back to x-real-ip and "unknown" for request metadata', async () => {
    await login(loginRequest(VALID, { headers: { 'x-real-ip': '198.51.100.4' } }));
    expect((prisma.sessions.create as jest.Mock).mock.calls[0][0].data).toMatchObject({ ipAddress: '198.51.100.4', userAgent: 'unknown' });
  });

  it('still logs in when revoking old sessions fails', async () => {
    (prisma.sessions.updateMany as jest.Mock).mockRejectedValue(new Error('db hiccup'));
    const response = await login(loginRequest(VALID));
    expect(response.status).toBe(200);
    expect(prisma.sessions.create).toHaveBeenCalled();
  });

  it('sets defensive security headers', async () => {
    const response = await login(loginRequest(VALID));
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });
});

describe('server errors', () => {
  it('refuses to issue tokens when JWT_SECRET is missing', async () => {
    delete process.env.JWT_SECRET;
    const response = await login(loginRequest(VALID));
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Authentication service unavailable' });
    expect(prisma.sessions.create).not.toHaveBeenCalled();
  });

  it('returns 500 when the database fails', async () => {
    (prisma.users.findFirst as jest.Mock).mockRejectedValue(new Error('connection refused'));
    const response = await login(loginRequest(VALID));
    expect(response.status).toBe(500);
    // Internal error details are logged, not returned
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
