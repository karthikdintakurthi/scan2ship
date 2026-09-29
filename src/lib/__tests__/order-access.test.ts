jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    users: { findUnique: jest.fn() },
    user_sub_groups: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn(), update: jest.fn() },
    shopify_orders: { findFirst: jest.fn() },
  },
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

jest.mock('@/lib/delhivery', () => ({
  delhiveryService: { createOrder: jest.fn(), cancelOrder: jest.fn() },
}));
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn() }));
jest.mock('@/lib/cross-app-auth', () => ({ getCatalogApiKey: jest.fn() }));
jest.mock('@/lib/shopify-api', () => ({ ShopifyApiService: { updateOrderWithTracking: jest.fn() } }));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn() } }));

import { prisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';
import { UserRole, ROLE_PERMISSIONS, type AuthenticatedUser } from '@/lib/auth-middleware';
import { orderAccessWhere, parseOrderId } from '@/lib/application/policy';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import { matchesWhere } from '@/test-utils/prisma-where';
import { GET as getOrder, PUT as updateOrder } from '@/app/api/orders/[id]/route';
import { POST as fulfillOrder } from '@/app/api/orders/[id]/fulfill/route';
import { POST as retryDelhivery } from '@/app/api/orders/[id]/retry-delhivery/route';
import { POST as updateDelhiveryOrder } from '@/app/api/delhivery/update-order/route';

type OrderRow = Record<string, unknown> & { id: number; clientId: string };

const ORDERS: OrderRow[] = [
  { id: 1, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, pickup_location: 'a-warehouse', delhivery_waybill_number: 'AWB-A1', courier_service: 'delhivery' },
  { id: 2, clientId: 'client-a', created_by: 'someone-else', sub_group: 'north', pickup_location: 'a-warehouse', delhivery_waybill_number: 'AWB-A2', courier_service: 'delhivery' },
  { id: 3, clientId: 'client-a', created_by: 'someone-else', sub_group: 'south', pickup_location: 'a-warehouse', delhivery_waybill_number: 'AWB-A3', courier_service: 'delhivery' },
  { id: 9, clientId: 'client-b', created_by: 'other-tenant-user', sub_group: null, pickup_location: 'b-warehouse', delhivery_waybill_number: 'AWB-B9', courier_service: 'delhivery' },
];

const findUser = prisma.users.findUnique as jest.Mock;
const findSubGroup = prisma.user_sub_groups.findFirst as jest.Mock;
const findOrder = prisma.orders.findFirst as jest.Mock;
const updateOrderRow = prisma.orders.update as jest.Mock;
const fetchMock = global.fetch as jest.Mock;

function actAs(role: string, subGroup?: string) {
  findUser.mockResolvedValue(authUserRow(role));
  findSubGroup.mockResolvedValue(subGroup ? { subGroups: { name: subGroup } } : null);
}

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function user(role: UserRole): AuthenticatedUser {
  return {
    id: TEST_USER_ID,
    email: 'user@client-a.test',
    role,
    clientId: 'client-a',
    isActive: true,
    client: { id: 'client-a', isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  findOrder.mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  updateOrderRow.mockImplementation(async ({ where, data }) => ({ ...ORDERS.find((row) => row.id === where.id), ...data }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('orderAccessWhere', () => {
  it('limits tenant users to their tenant', async () => {
    expect(await orderAccessWhere(user(UserRole.USER))).toEqual({ clientId: 'client-a' });
  });

  it('limits child users to their sub-group or their own orders', async () => {
    findSubGroup.mockResolvedValue({ subGroups: { name: 'north' } });
    expect(await orderAccessWhere(user(UserRole.CHILD_USER))).toEqual({
      clientId: 'client-a',
      OR: [{ sub_group: 'north' }, { created_by: TEST_USER_ID }],
    });
  });

  it('limits child users without a sub-group to their own orders', async () => {
    findSubGroup.mockResolvedValue(null);
    expect(await orderAccessWhere(user(UserRole.CHILD_USER))).toEqual({ clientId: 'client-a', created_by: TEST_USER_ID });
  });
});

describe('parseOrderId', () => {
  it.each([['12', 12], ['12abc', null], ['0', null], ['-4', null], ['1.5', null], ['', null]])('parses %p as %p', (input, expected) => {
    expect(parseOrderId(input)).toBe(expected);
  });
});

describe('GET /api/orders/[id]', () => {
  it('returns an order from the caller tenant', async () => {
    actAs('user');
    const response = await getOrder(signedRequest(), params('2'));
    expect(response.status).toBe(200);
    expect((await response.json()).id).toBe(2);
  });

  it('returns 404 for another tenant order', async () => {
    actAs('client_admin');
    const response = await getOrder(signedRequest(), params('9'));
    expect(response.status).toBe(404);
  });

  it('applies the sub-group rule to child users', async () => {
    actAs('child_user', 'north');
    expect((await getOrder(signedRequest(), params('2'))).status).toBe(200);
    expect((await getOrder(signedRequest(), params('3'))).status).toBe(404);
  });
});

describe('PUT /api/orders/[id]', () => {
  it('updates only allowlisted fields on an accessible order', async () => {
    actAs('user');
    const response = await updateOrder(signedRequest({ name: 'New Name', pincode: '560001' }), params('2'));
    expect(response.status).toBe(200);
    expect(updateOrderRow).toHaveBeenCalledWith({ where: { id: 2 }, data: { name: 'New Name', pincode: '560001' } });
  });

  it.each([['clientId', 'client-b'], ['created_by', 'attacker'], ['delhivery_api_status', 'success'], ['sub_group', 'south']])(
    'rejects attempts to set %s',
    async (field, value) => {
      actAs('user');
      const response = await updateOrder(signedRequest({ name: 'x', [field]: value }), params('2'));
      expect(response.status).toBe(400);
      expect(updateOrderRow).not.toHaveBeenCalled();
    }
  );

  it('returns 404 and does not update another tenant order', async () => {
    actAs('client_admin');
    const response = await updateOrder(signedRequest({ name: 'Hijacked' }), params('9'));
    expect(response.status).toBe(404);
    expect(updateOrderRow).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders/[id]/fulfill', () => {
  it('rejects unauthenticated callers before loading the order', async () => {
    const response = await fulfillOrder(signedRequest({}, { authenticated: false }), params('1'));
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(findOrder).not.toHaveBeenCalled();
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });

  it('does not book a shipment for another tenant order', async () => {
    actAs('user');
    const response = await fulfillOrder(signedRequest(), params('9'));
    expect(response.status).toBe(404);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders/[id]/retry-delhivery', () => {
  it('does not book a shipment for another tenant order', async () => {
    actAs('user');
    const response = await retryDelhivery(signedRequest(), params('9'));
    expect(response.status).toBe(404);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/delhivery/update-order', () => {
  beforeEach(() => {
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('tenant-a-key');
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: true }),
    });
  });

  it('rejects unauthenticated callers without calling Delhivery', async () => {
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 1, name: 'x' }, { authenticated: false }));
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns 404 for another tenant order without calling Delhivery', async () => {
    actAs('user');
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 9, address: 'Somewhere' }));
    expect(response.status).toBe(404);
    expect(getDelhiveryApiKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the stored waybill and the order tenant's key, ignoring caller-supplied waybill and pickup", async () => {
    actAs('user');
    const response = await updateDelhiveryOrder(
      signedRequest({ orderId: 2, waybill: 'AWB-B9', pickupLocation: 'b-warehouse', address: 'New address', cod: 0 })
    );
    expect(response.status).toBe(200);
    expect(getDelhiveryApiKey).toHaveBeenCalledWith('a-warehouse', 'client-a');

    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Token tenant-a-key');
    expect(JSON.parse(init.body)).toEqual({ waybill: 'AWB-A2', address: 'New address', cod: 0 });
  });
});
