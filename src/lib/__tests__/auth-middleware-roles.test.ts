import type { NextRequest } from 'next/server';

jest.unmock('jsonwebtoken');
const jwt = jest.requireActual('jsonwebtoken');

jest.mock('next/server', () => ({
  NextResponse: class {
    static json(body: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => body };
    }
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: { findUnique: jest.fn() },
    clients: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

jest.mock('@/lib/credit-service', () => ({
  CreditService: { addCredits: jest.fn() },
}));

import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import {
  authorizeUser,
  hasRequiredRole,
  UserRole,
  ROLE_PERMISSIONS,
  type AuthenticatedUser,
} from '@/lib/auth-middleware';
import { POST as grantClientCredits } from '@/app/api/admin/credits/[clientId]/route';

const findUser = prisma.users.findUnique as jest.Mock;

function mockUserWithRole(role: string) {
  findUser.mockResolvedValue({
    id: 'user-1',
    email: 'user@tenant-a.test',
    role,
    clientId: 'client-a',
    isActive: true,
    parentUserId: null,
    createdBy: null,
    clients: { id: 'client-a', isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    userSubGroups: [],
    userPickupLocations: [],
  });
}

function requestWithToken(body: unknown = {}): NextRequest {
  const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET!, {
    issuer: 'scan2ship-saas',
    audience: 'scan2ship-users',
    algorithm: 'HS256',
  });
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  return {
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    cookies: { get: () => undefined },
    json: async () => body,
  } as unknown as NextRequest;
}

function userWithRole(role: string): AuthenticatedUser {
  return {
    id: 'user-1',
    email: 'user@tenant-a.test',
    role: role as UserRole,
    clientId: 'client-a',
    isActive: true,
    client: { id: 'client-a', isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role as UserRole] ?? [],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('auth-middleware exports', () => {
  it('no longer exports authorizeAdmin, which checked the non-existent UserRole.ADMIN', () => {
    expect(jest.requireActual('@/lib/auth-middleware')).not.toHaveProperty('authorizeAdmin');
    expect(Object.values(UserRole)).not.toContain('admin');
  });
});

describe('hasRequiredRole', () => {
  it('denies an unknown required role instead of comparing against undefined', () => {
    expect(hasRequiredRole(userWithRole('master_admin'), undefined as unknown as UserRole)).toBe(false);
    expect(hasRequiredRole(userWithRole('master_admin'), 'admin' as UserRole)).toBe(false);
  });

  it('denies a user whose stored role is unknown', () => {
    expect(hasRequiredRole(userWithRole('admin'), UserRole.CHILD_USER)).toBe(false);
  });
});

describe('authorizeUser required role', () => {
  it('denies when requiredRole is passed explicitly as undefined', async () => {
    mockUserWithRole('user');
    const result = await authorizeUser(requestWithToken(), { requiredRole: undefined });
    expect(result.user).toBeNull();
    expect(result.response?.status).toBe(403);
  });

  it('still defaults to USER when requiredRole is omitted', async () => {
    mockUserWithRole('user');
    expect((await authorizeUser(requestWithToken())).user?.role).toBe('user');

    mockUserWithRole('child_user');
    expect((await authorizeUser(requestWithToken())).response?.status).toBe(403);
  });

  it.each(['child_user', 'user', 'client_admin'])('rejects %s for SUPER_ADMIN routes', async (role) => {
    mockUserWithRole(role);
    const result = await authorizeUser(requestWithToken(), { requiredRole: UserRole.SUPER_ADMIN });
    expect(result.response?.status).toBe(403);
  });

  it.each(['super_admin', 'master_admin'])('allows %s for SUPER_ADMIN routes', async (role) => {
    mockUserWithRole(role);
    const result = await authorizeUser(requestWithToken(), { requiredRole: UserRole.SUPER_ADMIN });
    expect(result.user?.role).toBe(role);
  });
});

describe('POST /api/admin/credits/[clientId]', () => {
  function grant() {
    const request = requestWithToken({ amount: 1000, description: 'test' });
    return grantClientCredits(request, { params: Promise.resolve({ clientId: 'client-b' }) });
  }

  it.each(['user', 'client_admin'])('does not let a %s grant credits to another tenant', async (role) => {
    mockUserWithRole(role);
    const response = await grant();
    expect(response.status).toBe(403);
    expect(CreditService.addCredits).not.toHaveBeenCalled();
  });
});
