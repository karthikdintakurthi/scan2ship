/**
 * @jest-environment node
 *
 * Runs against a real Postgres database, only when S2S_SESSION_DATABASE_URL is
 * set, and only if it points at a database whose name contains "session".
 */
jest.unmock('jsonwebtoken');
jest.unmock('path');
jest.unmock('fs/promises');

const SESSION_DATABASE_URL = process.env.S2S_SESSION_DATABASE_URL;
const databaseName = SESSION_DATABASE_URL ? new URL(SESSION_DATABASE_URL).pathname.slice(1) : '';

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';

jest.mock('@/lib/prisma', () => {
  const url = process.env.S2S_SESSION_DATABASE_URL;
  if (!url) return { prisma: {} };
  const { PrismaClient } = jest.requireActual('@prisma/client');
  return { prisma: new PrismaClient({ datasources: { db: { url } } }) };
});
jest.mock('@/lib/persistent-rate-limiter', () => ({
  consumeFixedWindow: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

import { prisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { searchOrders } from '@/lib/application/orders';
import { authenticateMcpRequest, signMcpAccessToken } from '@/lib/mcp/auth';
import { createAuthorizationCode, revokeGrant } from '@/lib/mcp/oauth';
import { executeMcpTool } from '@/lib/mcp/tools';
import type { McpPrincipal } from '@/lib/mcp/principal';

const describeWithDatabase = SESSION_DATABASE_URL ? describe : describe.skip;
const RUN = Date.now();
const TENANT_A = `client-mcp-a-${RUN}`;
const TENANT_B = `client-mcp-b-${RUN}`;

function member(id: string, clientId: string, role: UserRole): AuthenticatedUser {
  return {
    id,
    email: `${id}@test.invalid`,
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

const userA = member(`user-mcp-a-${RUN}`, TENANT_A, UserRole.USER);
const userB = member(`user-mcp-b-${RUN}`, TENANT_B, UserRole.USER);

function principal(user: AuthenticatedUser, grantId: string): McpPrincipal {
  return {
    requestId: 'req',
    tenantId: user.clientId,
    userId: user.id,
    grantId,
    oauthClientId: `app-mcp-${RUN}`,
    scopes: ['orders:read', 'settings:read'],
    role: user.role,
    user,
  };
}

describeWithDatabase(`MCP read-pilot isolation (database ${databaseName || 'none'})`, () => {
  let grantA = '';

  beforeAll(async () => {
    if (!databaseName.includes('session')) {
      throw new Error(`Refusing to run against ${databaseName}: only session databases may be used`);
    }
    for (const id of [TENANT_A, TENANT_B]) {
      await prisma.clients.create({
        data: { id, name: id, companyName: id, email: `${id}@test.invalid`, updatedAt: new Date() },
      });
    }
    for (const u of [userA, userB]) {
      await prisma.users.create({
        data: { id: u.id, email: u.email, name: u.id, role: u.role, clientId: u.clientId, updatedAt: new Date() },
      });
    }
    await prisma.mcp_oauth_clients.create({
      data: { id: `app-mcp-${RUN}`, name: 'Test assistant', redirectUris: ['http://localhost:9/cb'] },
    });
    await prisma.orders.createMany({
      data: [
        {
          clientId: TENANT_A,
          name: 'Ada',
          mobile: '9876543210',
          address: '12 Street',
          city: 'Hyderabad',
          state: 'TG',
          country: 'India',
          pincode: '500001',
          courier_service: 'delhivery',
          pickup_location: 'wh-a',
          package_value: 100,
          weight: 50,
          total_items: 1,
          tracking_id: `AWB-A-${RUN}`,
          reference_number: `REF-A-${RUN}`,
          updated_at: new Date(),
        },
        {
          clientId: TENANT_B,
          name: 'Bob',
          mobile: '9123456789',
          address: '99 Lane',
          city: 'Mumbai',
          state: 'MH',
          country: 'India',
          pincode: '400001',
          courier_service: 'delhivery',
          pickup_location: 'wh-b',
          package_value: 100,
          weight: 50,
          total_items: 1,
          tracking_id: `AWB-B-${RUN}`,
          reference_number: `REF-B-${RUN}`,
          updated_at: new Date(),
        },
      ],
    });
    const created = await createAuthorizationCode({
      tenantId: TENANT_A,
      userId: userA.id,
      oauthClientId: `app-mcp-${RUN}`,
      redirectUri: 'http://localhost:9/cb',
      codeChallenge: 'challenge',
      scopes: ['orders:read', 'settings:read'],
      resource: 'http://localhost:3000/api/mcp',
    });
    grantA = created.grantId;
  });

  afterAll(async () => {
    await prisma.clients.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.$disconnect();
  });

  it('searches only the connected tenant and cannot read the other tenant’s order', async () => {
    const listed = await searchOrders(userA, { limit: 20, query: `REF-A-${RUN}` });
    expect(listed.orders).toHaveLength(1);
    expect(listed.orders[0].referenceNumber).toBe(`REF-A-${RUN}`);

    const other = await searchOrders(userA, { limit: 20, query: `REF-B-${RUN}` });
    expect(other.orders).toHaveLength(0);

    const tool = await executeMcpTool(principal(userA, grantA), 'search_orders', { query: `AWB-B-${RUN}` });
    expect((tool.structured as { orders: unknown[] }).orders).toHaveLength(0);
  });

  it('denies the next call after the grant is revoked', async () => {
    const token = signMcpAccessToken({
      userId: userA.id,
      tenantId: TENANT_A,
      grantId: grantA,
      oauthClientId: `app-mcp-${RUN}`,
      scopes: ['orders:read'],
    });
    const request = new Request('http://localhost:3000/api/mcp', {
      headers: { authorization: `Bearer ${token}` },
    });
    await expect(authenticateMcpRequest(request)).resolves.toMatchObject({ grantId: grantA });

    await revokeGrant(grantA, userA.id, TENANT_A);
    await expect(authenticateMcpRequest(request)).rejects.toMatchObject({ code: 'invalid_token' });
  });
});
