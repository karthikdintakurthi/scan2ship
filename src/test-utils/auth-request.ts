import type { NextRequest } from 'next/server';

const jwt = jest.requireActual('jsonwebtoken');

export const TEST_USER_ID = 'user-1';

/** Row shape returned by prisma.users.findUnique inside getAuthenticatedUser. */
export function authUserRow(role: string, clientId = 'client-a') {
  return {
    id: TEST_USER_ID,
    email: `user@${clientId}.test`,
    role,
    clientId,
    isActive: true,
    parentUserId: null,
    createdBy: null,
    clients: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    userSubGroups: [],
    userPickupLocations: [],
  };
}

/** Minimal request carrying a valid Scan2Ship JWT; enough for authorizeUser and route handlers. */
export function signedRequest(
  body: unknown = {},
  { authenticated = true, url = 'http://localhost/api/test' }: { authenticated?: boolean; url?: string } = {}
): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (authenticated) {
    const token = jwt.sign({ userId: TEST_USER_ID }, process.env.JWT_SECRET!, {
      issuer: 'scan2ship-saas',
      audience: 'scan2ship-users',
      algorithm: 'HS256',
    });
    headers.authorization = `Bearer ${token}`;
  }
  return {
    url,
    nextUrl: new URL(url),
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
      forEach: (fn: (value: string, key: string) => void) => Object.entries(headers).forEach(([k, v]) => fn(v, k)),
    },
    cookies: { get: () => undefined },
    json: async () => body,
  } as unknown as NextRequest;
}

/** Stand-in for next/server; the global Jest setup replaces Response with a stub that lacks static json(). */
export const nextServerMock = {
  NextResponse: class {
    static json(body: unknown, init?: { status?: number }) {
      return { status: init?.status ?? 200, json: async () => body };
    }
  },
};
