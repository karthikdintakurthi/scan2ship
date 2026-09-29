/**
 * @jest-environment node
 */
jest.unmock('jsonwebtoken');

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = 'client-a';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.MCP_ALLOWED_HOSTS = 'localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-32-chars';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/persistent-rate-limiter', () => ({
  consumeFixedWindow: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));
jest.mock('@/lib/labels/render-waybill', () => ({
  ...jest.requireActual('@/lib/labels/render-waybill'),
  renderWaybill: jest.fn(async (order: { id: number }, format: string) => ({
    html: `<html>label ${order.id} ${format}</html>`,
    filename: `waybill-${order.id}.html`,
  })),
}));

import jwt from 'jsonwebtoken';
import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { getCustomerOrderHistory, resolveShippingLabel } from '@/lib/application/orders';
import { renderWaybill } from '@/lib/labels/render-waybill';
import { authenticateMcpRequest, signMcpAccessToken } from '@/lib/mcp/auth';
import { createLabelLink, verifyLabelToken } from '@/lib/mcp/labels';
import { approvedScopes, optionalScopesForUser } from '@/lib/mcp/oauth';
import { createMcpServer } from '@/lib/mcp/server';
import { executeMcpTool } from '@/lib/mcp/tools';
import type { McpPrincipal } from '@/lib/mcp/principal';
import { GET as openLabel } from '@/app/api/mcp/labels/[token]/route';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const DAY = 24 * 60 * 60 * 1000;

function actor(role: UserRole, clientId = 'client-a', id = 'user-a'): AuthenticatedUser {
  return {
    id,
    email: `${id}@${clientId}.test`,
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

function principalFor(user: AuthenticatedUser, scopes: McpPrincipal['scopes']): McpPrincipal {
  return { requestId: 'req-1', tenantId: user.clientId, userId: user.id, grantId: 'grant-a', oauthClientId: 'app-1', scopes, role: user.role, user };
}

function order(overrides: Record<string, unknown>) {
  return {
    clientId: 'client-a',
    created_by: 'someone-else',
    sub_group: null,
    name: 'Ada',
    mobile: '9876543210',
    reseller_mobile: null,
    address: '12 Street',
    city: 'Hyderabad',
    state: 'TG',
    country: 'India',
    pincode: '500001',
    courier_service: 'delhivery',
    pickup_location: 'a-warehouse',
    package_value: 500,
    weight: 200,
    total_items: 1,
    tracking_id: 'AWB',
    reference_number: 'REF',
    tracking_status: 'pending',
    delhivery_waybill_number: null,
    delhivery_api_status: null,
    product_description: null,
    is_cod: false,
    created_at: new Date(Date.now() - 2 * DAY),
    updated_at: new Date(),
    clients: { client_order_configs: { printmode: 'thermal' } },
    ...overrides,
  };
}

const ORDERS = [
  order({ id: 1 }),
  order({ id: 2, reseller_mobile: '919876543210', mobile: '9000000000' }),
  order({ id: 3, created_at: new Date(Date.now() - 45 * DAY) }),
  order({ id: 4, sub_group: 'north' }),
  order({ id: 5, mobile: '9111111111' }),
  order({ id: 9, clientId: 'client-b' }),
];

function grantRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'grant-a',
    tenantId: 'client-a',
    userId: 'user-a',
    oauthClientId: 'app-1',
    scopes: ['orders:read', 'labels:read'],
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
  (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue({ enableCustomerOrderHistory: true, customerOrderHistoryDays: 30 });
  (prisma.orders.findMany as jest.Mock).mockImplementation(async ({ where, take }) =>
    ORDERS.filter((row) => matchesWhere(row, where)).slice(0, take)
  );
  (prisma.orders.findFirst as jest.Mock).mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.mcp_grants.findUnique as jest.Mock).mockResolvedValue(grantRow());
});

describe('consent scopes', () => {
  it('grants customer PII and labels only when the user ticks them', () => {
    const user = { role: UserRole.USER };
    expect(approvedScopes('orders:read customers:read labels:read', [], user)).toEqual(['orders:read']);
    expect(approvedScopes('orders:read', ['labels:read'], user)).toEqual(['orders:read', 'labels:read']);
    expect(approvedScopes(null, ['customers:read', 'shipments:create'], user)).toContain('customers:read');
    expect(approvedScopes(null, ['customers:read', 'shipments:create'], user)).not.toContain('shipments:create');
  });

  it('offers the optional scopes to child users, without credits', () => {
    expect(optionalScopesForUser({ role: UserRole.CHILD_USER })).toEqual(['customers:read', 'labels:read']);
    expect(approvedScopes(null, [], { role: UserRole.CHILD_USER })).not.toContain('credits:read');
  });
});

describe('get_customer_order_history', () => {
  it('matches the last 10 digits of customer or reseller mobile inside the tenant window', async () => {
    const result = await getCustomerOrderHistory(actor(UserRole.USER), { mobile: '+91-98765-43210' });
    expect(result.enabled).toBe(true);
    expect(result.days).toBe(30);
    expect(result.orders.map((row) => row.id).sort()).toEqual([1, 2, 4]);
    expect(result.orders[0].address).toBe('12 Street');
  });

  it('applies the child-user sub-group rule', async () => {
    (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue({ subGroups: { name: 'north' } });
    const result = await getCustomerOrderHistory(actor(UserRole.CHILD_USER), { mobile: '9876543210' });
    expect(result.orders.map((row) => row.id)).toEqual([4]);
  });

  it('never returns another tenant order', async () => {
    const result = await getCustomerOrderHistory(actor(UserRole.USER, 'client-b', 'user-b'), { mobile: '9876543210' });
    expect(result.orders.map((row) => row.id)).toEqual([9]);
  });

  it('follows the account setting when history is off', async () => {
    (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue({ enableCustomerOrderHistory: false, customerOrderHistoryDays: 30 });
    const result = await getCustomerOrderHistory(actor(UserRole.USER), { mobile: '9876543210' });
    expect(result).toMatchObject({ enabled: false, count: 0, orders: [] });
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
  });

  it('clamps the configured window to 365 days', async () => {
    (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue({ enableCustomerOrderHistory: true, customerOrderHistoryDays: 5000 });
    expect((await getCustomerOrderHistory(actor(UserRole.USER), { mobile: '9876543210' })).days).toBe(365);
  });

  it('rejects numbers shorter than 10 digits', async () => {
    await expect(getCustomerOrderHistory(actor(UserRole.USER), { mobile: '98765-4321x' })).rejects.toMatchObject({ code: 'invalid_params' });
  });

  it('requires customers:read', async () => {
    const principal = principalFor(actor(UserRole.USER), ['orders:read']);
    await expect(executeMcpTool(principal, 'get_customer_order_history', { mobile: '9876543210' })).rejects.toMatchObject({ code: 'insufficient_scope' });
  });
});

describe('get_shipping_label', () => {
  it('defaults to the tenant print mode and honours an explicit format', async () => {
    expect(await resolveShippingLabel(actor(UserRole.USER), 1)).toMatchObject({ orderId: 1, format: 'thermal' });
    expect(await resolveShippingLabel(actor(UserRole.USER), 1, 'a5')).toMatchObject({ format: 'a5' });
  });

  it('does not issue links for another tenant order', async () => {
    await expect(resolveShippingLabel(actor(UserRole.USER), 9)).rejects.toMatchObject({ code: 'not_found' });
  });

  it('returns a signed link, not the label, through the tool', async () => {
    const result = await executeMcpTool(principalFor(actor(UserRole.USER), ['labels:read']), 'get_shipping_label', { orderId: 1 });
    const label = result.structured as { url: string; expiresAt: string; format: string };
    expect(label.url).toMatch(/^http:\/\/localhost:3000\/api\/mcp\/labels\/[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(new Date(label.expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(10 * 60 * 1000);
    expect(label.format).toBe('thermal');
    expect(renderWaybill).not.toHaveBeenCalled();
  });
});

describe('label links', () => {
  const principal = principalFor(actor(UserRole.USER), ['orders:read', 'labels:read']);

  function tokenFrom(url: string) {
    return url.split('/').pop()!;
  }

  function open(token: string) {
    const request = new Request(`http://localhost:3000/api/mcp/labels/${token}`, { headers: { host: 'localhost:3000' } });
    return openLabel(request, { params: Promise.resolve({ token }) });
  }

  it('renders the label when the grant is still valid', async () => {
    const response = await open(tokenFrom(createLabelLink(principal, 1, 'a5').url));
    expect(response.status).toBe(200);
    // jest.setup.js stubs Response: headers keep their original case and the body is stored as given.
    expect(response.headers.get('Content-Type')).toContain('text/html');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect((response as unknown as { body: string }).body).toBe('<html>label 1 a5</html>');
  });

  it('stops working once the connection is revoked', async () => {
    const token = tokenFrom(createLabelLink(principal, 1, 'standard').url);
    (prisma.mcp_grants.findUnique as jest.Mock).mockResolvedValue(grantRow({ revokedAt: new Date() }));
    expect((await open(token)).status).toBe(401);
    expect(renderWaybill).not.toHaveBeenCalled();
  });

  it('requires labels:read on the grant, not just in the link', async () => {
    const token = tokenFrom(createLabelLink(principal, 1, 'standard').url);
    (prisma.mcp_grants.findUnique as jest.Mock).mockResolvedValue(grantRow({ scopes: ['orders:read'] }));
    expect((await open(token)).status).toBe(401);
  });

  it('re-checks order access when opened', async () => {
    const token = tokenFrom(createLabelLink(principal, 9, 'standard').url);
    expect((await open(token)).status).toBe(404);
  });

  it('rejects expired and tampered links', async () => {
    const expired = jwt.sign(
      { sub: 'user-a', tid: 'client-a', gid: 'grant-a', scope: 'labels:read', jti: 'x', oid: 1, fmt: 'standard' },
      process.env.JWT_SECRET!,
      { algorithm: 'HS256', issuer: 'http://localhost:3000', audience: 'http://localhost:3000/api/mcp/labels', expiresIn: -10 }
    );
    expect((await open(expired)).status).toBe(401);
    const token = tokenFrom(createLabelLink(principal, 1, 'standard').url);
    expect((await open(`${token.slice(0, -2)}xx`)).status).toBe(401);
  });

  it('cannot be swapped with an MCP access token', async () => {
    const access = signMcpAccessToken({ userId: 'user-a', tenantId: 'client-a', grantId: 'grant-a', oauthClientId: 'app-1', scopes: ['labels:read'] });
    expect(() => verifyLabelToken(access)).toThrow();
    const label = tokenFrom(createLabelLink(principal, 1, 'standard').url);
    const request = new Request('http://localhost:3000/api/mcp', { headers: { authorization: `Bearer ${label}` } });
    await expect(authenticateMcpRequest(request)).rejects.toMatchObject({ code: 'invalid_token' });
  });
});

describe('tool listing', () => {
  function registeredTools(scopes: McpPrincipal['scopes']): string[] {
    const server = createMcpServer(principalFor(actor(UserRole.USER), scopes)) as unknown as { _registeredTools: Record<string, unknown> };
    return Object.keys(server._registeredTools).sort();
  }

  it('lists only the tools the connection may call', () => {
    expect(registeredTools(['orders:read'])).toEqual(['get_order', 'search_orders']);
    expect(registeredTools(['orders:read', 'customers:read', 'labels:read'])).toEqual([
      'get_customer_order_history',
      'get_order',
      'get_shipping_label',
      'search_orders',
    ]);
  });
});
