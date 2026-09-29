jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: { findUnique: jest.fn((args) => require('@/test-utils/auth-request').liveSessionFor(args)) },
    users: { findUnique: jest.fn() },
    user_sub_groups: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    pickup_locations: { findFirst: jest.fn() },
    user_pickup_locations: { findMany: jest.fn().mockResolvedValue([]) },
    // Courier checks are covered in orders.test.ts; every courier is active here
    courier_services: { findFirst: jest.fn().mockResolvedValue({ code: 'any' }) },
  },
}));

// Pre-fix route versions constructed their own client; route it to the same fake data
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

jest.mock('@/lib/delhivery', () => ({
  delhiveryService: { createOrder: jest.fn(), cancelOrder: jest.fn() },
  DelhiveryOutcomeUnknownError: class DelhiveryOutcomeUnknownError extends Error {},
}));
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn() }));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn() } }));
jest.mock('@/lib/credit-service', () => ({
  CreditService: {
    getCreditCost: () => 1,
    chargeOrderBookingIfNeeded: jest.fn().mockResolvedValue({ didCharge: false, transactionId: 'txn-existing' }),
    refundCredits: jest.fn(),
  },
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(public readonly required: number) {
      super('Insufficient credits');
      this.name = 'InsufficientCreditsError';
    }
  },
}));

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
  { id: 4, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, pickup_location: 'a-warehouse', delhivery_waybill_number: 'AWB-A4', tracking_id: 'AWB-A4', delhivery_api_status: 'success', courier_service: 'delhivery' },
  { id: 5, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, pickup_location: 'a-warehouse', delhivery_waybill_number: null, courier_service: 'dtdc' },
].map((row) => ({ delhivery_retry_count: 0, delhivery_api_status: 'pending', tracking_id: null, reference_number: `REF-${row.id}`, ...row }));

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
  (prisma.orders.findUnique as jest.Mock).mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  (prisma.pickup_locations.findFirst as jest.Mock).mockResolvedValue({ delhiveryApiKey: 'any-tenant-key', label: 'x' });
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

  it('rejects moving an order to a pickup location the user may not use', async () => {
    actAs('user');
    (prisma.pickup_locations.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await updateOrder(signedRequest({ pickup_location: 'b-warehouse' }), params('2'));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/Pickup location "b-warehouse" is not available/);
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it('rejects switching an order to an inactive courier', async () => {
    actAs('user');
    (prisma.courier_services.findFirst as jest.Mock).mockResolvedValueOnce(null);
    const response = await updateOrder(signedRequest({ courier_service: 'blue_dart' }), params('2'));
    expect(response.status).toBe(400);
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it('keeps older orders editable when their courier and pickup are sent back unchanged', async () => {
    actAs('user');
    const response = await updateOrder(
      signedRequest({ name: 'New Name', courier_service: 'delhivery', pickup_location: 'a-warehouse' }),
      params('2')
    );
    expect(response.status).toBe(200);
    expect(prisma.courier_services.findFirst).not.toHaveBeenCalled();
    expect(prisma.pickup_locations.findFirst).not.toHaveBeenCalled();
  });

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

function loggedText() {
  return [console.log, console.warn, console.error]
    .flatMap((fn) => (fn as jest.Mock).mock.calls.flat())
    .map((arg) => (typeof arg === 'string' ? arg : JSON.stringify(arg)))
    .join(' ');
}

describe('order routes: invalid input', () => {
  it.each(['12abc', '0', '-1', 'abc'])('GET returns 404 for order ID %p without querying', async (id) => {
    actAs('user');
    const response = await getOrder(signedRequest(), params(id));
    expect(response.status).toBe(404);
    expect(findOrder).not.toHaveBeenCalled();
    expect(prisma.orders.findUnique).not.toHaveBeenCalled();
  });

  it('PUT returns 404 for an invalid order ID without querying', async () => {
    actAs('user');
    const response = await updateOrder(signedRequest({ name: 'x' }), params('abc'));
    expect(response.status).toBe(404);
    expect(findOrder).not.toHaveBeenCalled();
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it.each([[['name']], [null], ['name']])('PUT rejects a non-object body %p', async (body) => {
    actAs('user');
    const response = await updateOrder(signedRequest(body), params('2'));
    expect(response.status).toBe(400);
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it('PUT does not log request headers, the token, or field values', async () => {
    actAs('user');
    const request = signedRequest({ name: 'Private Customer', mobile: '9876543210' });
    const token = request.headers.get('authorization')!.slice('Bearer '.length);

    await updateOrder(request, params('2'));

    const logged = loggedText();
    expect(logged).not.toContain(token);
    expect(logged).not.toContain('Private Customer');
    expect(logged).not.toContain('9876543210');
  });
});

describe('POST /api/orders/[id]/fulfill: accessible orders', () => {
  it('books the shipment for an order in the caller tenant and stores the waybill', async () => {
    actAs('user');
    (delhiveryService.createOrder as jest.Mock).mockResolvedValue({ success: true, waybill_number: 'WB-NEW', order_id: 'DL-1' });

    const response = await fulfillOrder(signedRequest(), params('1'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ success: true, orderId: 1, trackingId: 'WB-NEW' });
    expect((delhiveryService.createOrder as jest.Mock).mock.calls[0][0]).toMatchObject({ id: 1, clientId: 'client-a' });
    expect(updateOrderRow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: expect.objectContaining({ tracking_id: 'WB-NEW' }) })
    );
  });

  it('refuses to fulfill an already fulfilled order', async () => {
    actAs('user');
    const response = await fulfillOrder(signedRequest(), params('4'));
    expect(response.status).toBe(400);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });

  it('rejects an invalid order ID', async () => {
    actAs('user');
    const response = await fulfillOrder(signedRequest(), params('abc'));
    expect(response.status).toBe(400);
    expect(findOrder).not.toHaveBeenCalled();
  });

  it('applies the child-user rule', async () => {
    actAs('child_user', 'north');
    expect((await fulfillOrder(signedRequest(), params('3'))).status).toBe(404);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/orders/[id]/retry-delhivery: accessible orders', () => {
  it("retries with the order's own tenant and stores the waybill", async () => {
    actAs('user');
    (delhiveryService.createOrder as jest.Mock).mockResolvedValue({ success: true, waybill_number: 'WB-RETRY', order_id: 'DL-2' });

    const response = await retryDelhivery(signedRequest(), params('2'));

    expect(response.status).toBe(200);
    expect((delhiveryService.createOrder as jest.Mock).mock.calls[0][0]).toMatchObject({ clientId: 'client-a', pickup_location: 'a-warehouse' });
    expect(updateOrderRow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ tracking_id: 'WB-RETRY', delhivery_api_status: 'success' }) })
    );
  });

  it('records the failure on the order when Delhivery throws', async () => {
    actAs('user');
    (delhiveryService.createOrder as jest.Mock).mockRejectedValue(new Error('Delhivery is down'));

    const response = await retryDelhivery(signedRequest(), params('2'));

    expect(response.status).toBe(500);
    expect(updateOrderRow).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2 },
        data: expect.objectContaining({ delhivery_api_status: 'failed', delhivery_api_error: 'Delhivery is down' }),
      })
    );
  });

  it('returns 500 without touching any order when the failure happens before the access check', async () => {
    const { applySecurityMiddleware } = jest.requireMock('@/lib/security-middleware');
    (applySecurityMiddleware as jest.Mock).mockRejectedValueOnce(new Error('rate limiter unavailable'));

    const response = await retryDelhivery(signedRequest(), params('2'));

    expect(response.status).toBe(500);
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it('returns 404 for an invalid order ID without querying', async () => {
    actAs('user');
    const response = await retryDelhivery(signedRequest(), params('abc'));
    expect(response.status).toBe(404);
    expect(findOrder).not.toHaveBeenCalled();
  });

  it('records a non-Error failure as "Unknown error"', async () => {
    actAs('user');
    (delhiveryService.createOrder as jest.Mock).mockRejectedValue('timeout');

    const response = await retryDelhivery(signedRequest(), params('2'));

    expect(response.status).toBe(500);
    expect(updateOrderRow).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 2 }, data: expect.objectContaining({ delhivery_api_error: 'Unknown error' }) })
    );
  });

  it('rejects orders that are not Delhivery orders', async () => {
    actAs('user');
    const response = await retryDelhivery(signedRequest(), params('5'));
    expect(response.status).toBe(400);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });
});

describe('POST /api/delhivery/update-order: failure handling', () => {
  function delhiveryReply(status: number, body: unknown, contentType = 'application/json') {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: { get: () => contentType },
      json: async () => body,
      text: async () => String(body),
    };
  }

  beforeEach(() => {
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('tenant-a-secret-key');
  });

  it.each([[{}], [{ orderId: 'abc' }], [{ orderId: -1 }]])('rejects %p without looking anything up', async (body) => {
    actAs('user');
    const response = await updateDelhiveryOrder(signedRequest(body));
    expect(response.status).toBe(400);
    expect(findOrder).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects orders without a Delhivery waybill', async () => {
    actAs('user');
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 5, name: 'x' }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call Delhivery when the pickup location has no key', async () => {
    actAs('user');
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('');
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2, name: 'x' }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('passes a Delhivery authentication failure through as 401', async () => {
    actAs('user');
    fetchMock.mockResolvedValue(delhiveryReply(401, { error: 'bad token' }));
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2, name: 'x' }));
    expect(response.status).toBe(401);
  });

  it('reports other Delhivery errors as 400, including non-JSON bodies', async () => {
    actAs('user');
    fetchMock.mockResolvedValue(delhiveryReply(502, '<html>Bad gateway</html>', 'text/html'));
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2, name: 'x' }));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.delhiveryError).toMatchObject({ error: 'Non-JSON response from Delhivery API' });
  });

  it('returns 500 on a network error', async () => {
    actAs('user');
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2, name: 'x' }));
    expect(response.status).toBe(500);
  });

  it('never logs the carrier key', async () => {
    actAs('user');
    (prisma.pickup_locations.findFirst as jest.Mock).mockResolvedValue({ delhiveryApiKey: 'tenant-a-secret-key', label: 'A' });
    fetchMock.mockResolvedValue(delhiveryReply(200, { status: true }));

    // waybill and pickupLocation are ignored now, but let a pre-fix handler reach its logging
    const response = await updateDelhiveryOrder(
      signedRequest({ orderId: 2, name: 'x', waybill: 'AWB-A2', pickupLocation: 'a-warehouse' })
    );

    expect(response.status).toBe(200);
    expect(loggedText()).not.toContain('tenant-a-secret-key');
  });

  it('applies the child-user rule', async () => {
    actAs('child_user', 'north');
    const response = await updateDelhiveryOrder(signedRequest({ orderId: 3, name: 'x' }));
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('OrderList request to /api/delhivery/update-order', () => {
  it("is accepted by the route and edits the stored waybill with the order tenant's key", async () => {
    const { buildDelhiveryUpdateRequest } = jest.requireActual('@/lib/delhivery-update-request');
    actAs('user');
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('tenant-a-key');
    fetchMock.mockResolvedValue({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({}) });

    const browserRequest = buildDelhiveryUpdateRequest(
      { id: 2, is_cod: false, weight: 300, name: 'Asha', mobile: '9876543210', address: 'New', city: 'C', state: 'S', pincode: '560001', country: 'India' },
      'ignored-by-test'
    );
    const response = await updateDelhiveryOrder(signedRequest(JSON.parse(browserRequest.body)));

    expect(response.status).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe('Token tenant-a-key');
    expect(JSON.parse(init.body)).toMatchObject({ waybill: 'AWB-A2', pt: 'Pre-paid', cod: 0, weight: 300, address: 'New' });
  });
});

describe('POST /api/delhivery/update-order: request guards', () => {
  it('returns the security middleware response without loading the order', async () => {
    const { applySecurityMiddleware } = jest.requireMock('@/lib/security-middleware');
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });

    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2 }));

    expect(response.status).toBe(429);
    expect(findOrder).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a malformed JSON reply from Delhivery as an error', async () => {
    actAs('user');
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('tenant-a-key');
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      headers: { get: () => 'application/json' },
      json: async () => { throw new SyntaxError('Unexpected token'); },
    });

    const response = await updateDelhiveryOrder(signedRequest({ orderId: 2, name: 'x' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.delhiveryError).toEqual({ error: 'Invalid JSON response from Delhivery API' });
  });
});
