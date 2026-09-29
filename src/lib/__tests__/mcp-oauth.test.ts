/**
 * @jest-environment node
 */
jest.unmock('jsonwebtoken');

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = 'client-a';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-32-chars';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));

import jwt from 'jsonwebtoken';
import { prisma as realPrisma } from '@/lib/prisma';
import { authenticateMcpRequest, signMcpAccessToken } from '@/lib/mcp/auth';
import { isAllowedRedirectUri, parseRequestedScopes } from '@/lib/mcp/oauth';
import { sha256S256 } from '@/lib/mcp/crypto';
import { mcpIssuer, mcpResourceUrl } from '@/lib/mcp/config';
import type { createPrismaMock } from '@/test-utils/prisma-mock';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

function grantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-a',
    tenantId: 'client-a',
    userId: 'user-a',
    oauthClientId: 'app-1',
    scopes: ['orders:read', 'settings:read'],
    revokedAt: null,
    users: {
      id: 'user-a',
      email: 'user-a@client-a.test',
      role: 'user',
      isActive: true,
      clientId: 'client-a',
      parentUserId: null,
      createdBy: null,
      clients: { id: 'client-a', isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.mcp_grants.findUnique as jest.Mock).mockResolvedValue(grantRow());
});

describe('MCP OAuth helpers', () => {
  it('accepts https and localhost redirect URIs only', () => {
    expect(isAllowedRedirectUri('https://claude.ai/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://localhost:8787/callback')).toBe(true);
    expect(isAllowedRedirectUri('http://evil.example/callback')).toBe(false);
    expect(isAllowedRedirectUri('https://ok.example/cb#frag')).toBe(false);
  });

  it('intersects requested scopes with the read-pilot set', () => {
    expect(parseRequestedScopes('orders:read shipments:create')).toEqual(['orders:read']);
  });

  it('computes S256 challenges', () => {
    expect(sha256S256('abc')).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('MCP access tokens', () => {
  it('rejects a website JWT at the MCP resource', async () => {
    const website = jwt.sign({ userId: 'user-a' }, process.env.JWT_SECRET!, {
      issuer: 'scan2ship-saas',
      audience: 'scan2ship-users',
      algorithm: 'HS256',
    });
    const request = new Request('http://localhost:3000/api/mcp', {
      headers: { authorization: `Bearer ${website}` },
    });
    await expect(authenticateMcpRequest(request)).rejects.toMatchObject({ code: 'invalid_token' });
  });

  it('accepts a tenant-bound MCP token and rejects it after revoke', async () => {
    const token = signMcpAccessToken({
      userId: 'user-a',
      tenantId: 'client-a',
      grantId: 'grant-a',
      oauthClientId: 'app-1',
      scopes: ['orders:read'],
    });
    const decoded = jwt.verify(token, process.env.JWT_SECRET!, {
      issuer: mcpIssuer(),
      audience: mcpResourceUrl(),
    }) as { aud: string; tid: string };
    expect(decoded.aud).toBe('http://localhost:3000/api/mcp');
    expect(decoded.tid).toBe('client-a');

    const request = new Request('http://localhost:3000/api/mcp', {
      headers: { authorization: `Bearer ${token}` },
    });
    await expect(authenticateMcpRequest(request)).resolves.toMatchObject({ tenantId: 'client-a', grantId: 'grant-a' });

    (prisma.mcp_grants.findUnique as jest.Mock).mockResolvedValue(grantRow({ revokedAt: new Date() }));
    await expect(authenticateMcpRequest(request)).rejects.toMatchObject({ code: 'invalid_token' });
  });

  it('does not allow a tenant missing from the allowlist', async () => {
    const token = signMcpAccessToken({
      userId: 'user-b',
      tenantId: 'client-b',
      grantId: 'grant-b',
      oauthClientId: 'app-1',
      scopes: ['orders:read'],
    });
    const request = new Request('http://localhost:3000/api/mcp', {
      headers: { authorization: `Bearer ${token}` },
    });
    await expect(authenticateMcpRequest(request)).rejects.toMatchObject({ code: 'tenant_not_allowed' });
  });
});
