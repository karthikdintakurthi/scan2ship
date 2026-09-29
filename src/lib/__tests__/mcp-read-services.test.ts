/**
 * @jest-environment node
 */
jest.unmock('jsonwebtoken');

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/persistent-rate-limiter', () => ({
  consumeFixedWindow: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { getCreditBalanceReadOnly } from '@/lib/application/credits';
import { getOrder, searchOrders } from '@/lib/application/orders';
import { quoteShipping } from '@/lib/application/shipping';
import { executeMcpTool } from '@/lib/mcp/tools';
import type { McpPrincipal } from '@/lib/mcp/principal';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

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
  return {
    requestId: 'req-1',
    tenantId: user.clientId,
    userId: user.id,
    grantId: 'grant-a',
    oauthClientId: 'app-1',
    scopes,
    role: user.role,
    user,
  };
}

const ORDERS = [
  {
    id: 1,
    clientId: 'client-a',
    created_by: 'user-a',
    sub_group: null,
    name: 'Ada',
    mobile: '9876543210',
    address: '12 Secret Street',
    city: 'Hyderabad',
    state: 'TG',
    country: 'India',
    pincode: '500001',
    courier_service: 'delhivery',
    pickup_location: 'a-warehouse',
    package_value: 500,
    weight: 200,
    total_items: 1,
    tracking_id: 'AWB-A1',
    reference_number: 'REF-1',
    is_cod: false,
    created_at: new Date('2026-09-01T10:00:00Z'),
    updated_at: new Date('2026-09-01T11:00:00Z'),
    tracking_status: 'in_transit',
    delhivery_waybill_number: 'AWB-A1',
    delhivery_api_status: 'success',
    product_description: 'Jewellery',
    sub_group: null,
  },
  {
    id: 9,
    clientId: 'client-b',
    created_by: 'user-b',
    sub_group: null,
    name: 'Other tenant',
    mobile: '9123456789',
    address: 'Hidden',
    city: 'Mumbai',
    state: 'MH',
    country: 'India',
    pincode: '400001',
    courier_service: 'delhivery',
    pickup_location: 'b-warehouse',
    package_value: 100,
    weight: 100,
    total_items: 1,
    tracking_id: 'AWB-B9',
    reference_number: 'REF-9',
    is_cod: false,
    created_at: new Date('2026-09-01T10:00:00Z'),
    updated_at: new Date('2026-09-01T11:00:00Z'),
    tracking_status: 'delivered',
    delhivery_waybill_number: 'AWB-B9',
    delhivery_api_status: 'success',
    product_description: 'Other',
    sub_group: null,
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.orders.findMany as jest.Mock).mockImplementation(async ({ where }: { where: unknown }) =>
    ORDERS.filter((row) => matchesWhere(row, where as never))
  );
  (prisma.orders.findFirst as jest.Mock).mockImplementation(async ({ where }: { where: unknown }) =>
    ORDERS.find((row) => matchesWhere(row, where as never)) ?? null
  );
  (prisma.client_credits.findUnique as jest.Mock).mockResolvedValue({ balance: 42 });
  (prisma.client_credits.create as jest.Mock).mockResolvedValue({ balance: 0 });
  (prisma.courier_services.findMany as jest.Mock).mockResolvedValue([
    { code: 'delhivery', name: 'Delhivery', isActive: true, isDefault: true, baseRate: 50, ratePerKg: 20, minWeight: 500, maxWeight: 20000, codCharges: 15, freeShippingThreshold: null, estimatedDays: 3 },
  ]);
  (prisma.pickup_locations.findMany as jest.Mock).mockResolvedValue([{ id: 'p1', value: 'a-warehouse', label: 'A Warehouse' }]);
  (prisma.clients.findUnique as jest.Mock).mockResolvedValue({ id: 'client-a', name: 'A', companyName: 'Tenant A', subscriptionPlan: 'basic', subscriptionStatus: 'active' });
  (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.mcp_grants.update as jest.Mock).mockResolvedValue({});
  (prisma.audit_logs.create as jest.Mock).mockResolvedValue({});
});

describe('MCP read services', () => {
  it('search_orders only returns the caller tenant', async () => {
    const result = await searchOrders(actor(UserRole.USER), { limit: 20 });
    expect(result.orders.map((row) => row.id)).toEqual([1]);
    expect(result.orders[0]).not.toHaveProperty('mobile');
    expect(result.orders[0]).not.toHaveProperty('address');
  });

  it('get_order hides street address and masks the phone without customers:read', async () => {
    const detail = await getOrder(actor(UserRole.USER), 1, ['orders:read']);
    expect(detail.address).toBeNull();
    expect(detail.mobile).toBe('******3210');
  });

  it('get_order does not reveal another tenant’s id', async () => {
    await expect(getOrder(actor(UserRole.USER), 9, ['orders:read'])).rejects.toMatchObject({ code: 'not_found' });
  });

  it('credit balance reads without creating a row', async () => {
    (prisma.client_credits.findUnique as jest.Mock).mockResolvedValue(null);
    const balance = await getCreditBalanceReadOnly('client-a');
    expect(balance.balance).toBe(0);
    expect(prisma.client_credits.create).not.toHaveBeenCalled();
  });

  it('quotes are labelled configured_estimate and are not live carrier rates', async () => {
    const quote = await quoteShipping(actor(UserRole.USER), { weightGrams: 1000, packageValueInr: 500, isCod: false });
    expect(quote.kind).toBe('configured_estimate');
    expect(quote.estimates[0]?.liveCarrierQuote).toBe(false);
    expect(quote.estimates[0].amountInr).toBe(60);
  });

  it('executeMcpTool denies a tool when the grant lacks the scope', async () => {
    await expect(executeMcpTool(principalFor(actor(UserRole.USER), ['orders:read']), 'get_credit_balance', {})).rejects.toMatchObject({
      code: 'insufficient_scope',
    });
  });

  it('search_orders tool does not include API keys or other-tenant rows', async () => {
    const result = await executeMcpTool(principalFor(actor(UserRole.USER), ['orders:read']), 'search_orders', { limit: 20 });
    const payload = JSON.stringify(result.structured);
    expect(payload).not.toMatch(/delhiveryApiKey|catalogApiKey|sha256:/);
    expect((result.structured as { orders: Array<{ id: number }> }).orders.map((row) => row.id)).toEqual([1]);
  });
});
