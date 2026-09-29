jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: { findUnique: jest.fn((args) => require('@/test-utils/auth-request').liveSessionFor(args)) },
    users: { findUnique: jest.fn() },
    user_sub_groups: { findFirst: jest.fn() },
    clients: { findUnique: jest.fn() },
    orders: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), delete: jest.fn() },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

jest.mock('@/lib/delhivery', () => {
  const cancelOrder = jest.fn();
  const createOrder = jest.fn();
  return {
    delhiveryService: { cancelOrder, createOrder },
    DelhiveryService: jest.fn().mockImplementation(() => ({ cancelOrder, createOrder })),
  };
});
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn() }));
jest.mock('@/lib/cross-app-auth', () => ({ getCatalogApiKey: jest.fn().mockResolvedValue(null) }));
jest.mock('@/lib/analytics-service', () => ({ __esModule: true, default: { trackOrderCreation: jest.fn() } }));
jest.mock('@/lib/credit-service', () => ({ CreditService: {} }));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn() } }));

import { prisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import { matchesWhere } from '@/test-utils/prisma-where';
import { POST as refreshStatuses } from '@/app/api/orders/refresh-statuses/route';
import { DELETE as deleteOrder } from '@/app/api/orders/[id]/route';
import { DELETE as bulkDeleteOrders } from '@/app/api/orders/route';

type OrderRow = {
  id: number;
  clientId: string;
  tracking_id: string | null;
  tracking_status: string | null;
  pickup_location: string;
  courier_service: string;
  created_by: string | null;
  sub_group: string | null;
  products: string | null;
};

const order = (id: number, overrides: Partial<OrderRow> = {}): OrderRow => ({
  id,
  clientId: 'client-a',
  tracking_id: `AWB-${id}`,
  tracking_status: 'pending',
  pickup_location: 'North',
  courier_service: 'delhivery',
  created_by: 'someone-else',
  sub_group: null,
  products: null,
  ...overrides,
});

const NORTH_IDS = Array.from({ length: 60 }, (_, i) => i + 1);
const ORDERS: OrderRow[] = [
  ...NORTH_IDS.map((id) => order(id)),
  order(101, { pickup_location: 'South', created_by: TEST_USER_ID }),
  order(102, { pickup_location: 'South' }),
  order(103, { pickup_location: 'South', tracking_status: null }),
  order(900, { clientId: 'client-b', pickup_location: 'North' }),
];

const RAW_STATUS_BY_WAYBILL = (waybill: string) => (Number(waybill.split('-')[1]) % 2 === 0 ? 'Delivered' : 'In Transit');

const findUser = prisma.users.findUnique as jest.Mock;
const findSubGroup = prisma.user_sub_groups.findFirst as jest.Mock;
const findManyOrders = prisma.orders.findMany as jest.Mock;
const findOrder = prisma.orders.findFirst as jest.Mock;
const updateOrderRow = prisma.orders.update as jest.Mock;
const getKey = getDelhiveryApiKey as jest.Mock;
const cancelOrder = delhiveryService.cancelOrder as jest.Mock;
let bulkTracking: jest.SpyInstance;

function actAs(role: string, subGroup?: string) {
  findUser.mockResolvedValue(authUserRow(role));
  findSubGroup.mockResolvedValue(subGroup ? { subGroups: { name: subGroup } } : null);
}

function statusUpdates() {
  return new Map(
    updateOrderRow.mock.calls
      .filter(([args]) => 'tracking_status' in args.data)
      .map(([args]) => [args.where.id, args.data.tracking_status])
  );
}

function errorUpdates() {
  return new Map(
    updateOrderRow.mock.calls
      .filter(([args]) => args.data.delhivery_api_error)
      .map(([args]) => [args.where.id, args.data.delhivery_api_error])
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  findManyOrders.mockImplementation(async ({ where }) => ORDERS.filter((row) => matchesWhere(row, where)));
  findOrder.mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  updateOrderRow.mockResolvedValue({});
  (prisma.orders.delete as jest.Mock).mockResolvedValue({});
  (prisma.$transaction as jest.Mock).mockImplementation(async (work) => work(prisma));
  (prisma.clients.findUnique as jest.Mock).mockResolvedValue({ id: 'client-a', name: 'A', companyName: 'A', slug: 'a' });
  getKey.mockImplementation(async (pickup: string, clientId: string) => `key-${clientId}-${pickup}`);
  cancelOrder.mockResolvedValue({ success: true, message: 'cancelled' });

  // Delhivery returns results in reverse order and omits AWB-5
  bulkTracking = jest
    .spyOn(delhiveryTrackingService, 'getBulkTrackingDetails')
    .mockImplementation(async (waybills: string[]) =>
      waybills
        .filter((waybill) => waybill !== 'AWB-5')
        .reverse()
        .map((waybill) => {
          const raw = RAW_STATUS_BY_WAYBILL(waybill);
          return {
            success: true,
            trackingId: waybill,
            data: { tracking_id: waybill, status: raw, status_description: raw, current_status: raw, current_status_description: raw },
          };
        })
    );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/orders/refresh-statuses', () => {
  it('rejects unauthenticated callers', async () => {
    const response = await refreshStatuses(signedRequest({ orderIds: [1] }, { authenticated: false }));
    expect(response.status).toBeGreaterThanOrEqual(401);
    expect(findManyOrders).not.toHaveBeenCalled();
  });

  it.each([
    ['an empty list', []],
    ['non-integer IDs', [1, 'two']],
    ['more than 100 IDs', Array.from({ length: 101 }, (_, i) => i + 1)],
  ])('rejects %s', async (_label, orderIds) => {
    actAs('user');
    const response = await refreshStatuses(signedRequest({ orderIds }));
    expect(response.status).toBe(400);
    expect(bulkTracking).not.toHaveBeenCalled();
  });

  it("never requests or updates another tenant's orders", async () => {
    actAs('user');
    const response = await refreshStatuses(signedRequest({ orderIds: [1, 2, 900] }));
    const body = await response.json();

    expect(body.results.map((r: { orderId: number }) => r.orderId).sort()).toEqual([1, 2]);
    expect(bulkTracking.mock.calls.flatMap(([waybills]) => waybills)).not.toContain('AWB-900');
    expect(updateOrderRow.mock.calls.map(([args]) => args.where.id)).not.toContain(900);
    expect(getKey.mock.calls.every(([, clientId]) => clientId === 'client-a')).toBe(true);
  });

  it("uses each pickup location's own key and only its own waybills", async () => {
    actAs('user');
    await refreshStatuses(signedRequest({ orderIds: [1, 2, 101, 102] }));

    const calls = bulkTracking.mock.calls.map(([waybills, key]) => [key, [...waybills].sort()]);
    expect(calls).toEqual(
      expect.arrayContaining([
        ['key-client-a-North', ['AWB-1', 'AWB-2']],
        ['key-client-a-South', ['AWB-101', 'AWB-102']],
      ])
    );
    expect(calls).toHaveLength(2);
  });

  it('matches results by waybill when Delhivery reorders and omits them, across more than 50 orders', async () => {
    actAs('user');
    const response = await refreshStatuses(signedRequest({ orderIds: NORTH_IDS }));
    const body = await response.json();

    const updates = statusUpdates();
    for (const id of NORTH_IDS.filter((id) => id !== 5)) {
      const expected = delhiveryTrackingService.mapStatusToInternal(RAW_STATUS_BY_WAYBILL(`AWB-${id}`));
      expect(updates.get(id)).toBe(expected);
    }
    expect(updates.has(5)).toBe(false);
    expect(errorUpdates().get(5)).toMatch(/No tracking result/);
    expect(body.stats).toMatchObject({ totalProcessed: 60, totalUpdated: 59, totalErrors: 1 });
  });

  it('records an error per order, without calling Delhivery, when the pickup location has no key', async () => {
    actAs('user');
    getKey.mockResolvedValue('');
    const response = await refreshStatuses(signedRequest({ orderIds: [1, 2] }));
    const body = await response.json();

    expect(bulkTracking).not.toHaveBeenCalled();
    expect(body.stats).toMatchObject({ totalUpdated: 0, totalErrors: 2 });
    expect([...errorUpdates().keys()].sort()).toEqual([1, 2]);
  });

  it('records an error per order when the tracking request throws', async () => {
    actAs('user');
    bulkTracking.mockRejectedValue(new Error('Delhivery timeout'));
    const response = await refreshStatuses(signedRequest({ orderIds: [1, 2] }));
    const body = await response.json();

    expect(body.stats).toMatchObject({ totalUpdated: 0, totalErrors: 2 });
    expect(errorUpdates().get(1)).toBe('Delhivery timeout');
  });

  it('reports non-Error failures from the tracking request', async () => {
    actAs('user');
    bulkTracking.mockRejectedValue('socket hang up');
    await refreshStatuses(signedRequest({ orderIds: [1] }));
    expect(errorUpdates().get(1)).toBe('Unknown error');
  });

  it('falls back to the raw status and reports a missing previous status as "null"', async () => {
    actAs('user');
    bulkTracking.mockResolvedValue([
      { success: true, trackingId: 'AWB-103', data: { tracking_id: 'AWB-103', status: 'Delivered', status_description: '', current_status: '', current_status_description: '' } },
    ]);

    const response = await refreshStatuses(signedRequest({ orderIds: [103] }));
    const body = await response.json();

    expect(body.results).toEqual([
      expect.objectContaining({ orderId: 103, oldStatus: 'null', newStatus: delhiveryTrackingService.mapStatusToInternal('Delivered') }),
    ]);
  });

  it('returns 404 when none of the requested orders are accessible', async () => {
    actAs('user');
    const response = await refreshStatuses(signedRequest({ orderIds: [900] }));

    expect(response.status).toBe(404);
    expect(getKey).not.toHaveBeenCalled();
    expect(bulkTracking).not.toHaveBeenCalled();
    expect(updateOrderRow).not.toHaveBeenCalled();
  });

  it('applies the child-user rule', async () => {
    actAs('child_user');
    const response = await refreshStatuses(signedRequest({ orderIds: [1, 101, 102] }));
    const body = await response.json();

    expect(body.results.map((r: { orderId: number }) => r.orderId)).toEqual([101]);
  });
});

describe('Delhivery cancellation on order deletion', () => {
  it("DELETE /api/orders/[id] cancels with the order's string tenant ID", async () => {
    actAs('user');
    const response = await deleteOrder(signedRequest(), { params: Promise.resolve({ id: '1' }) });

    expect(response.status).toBe(200);
    expect(cancelOrder).toHaveBeenCalledWith('AWB-1', 'North', 'client-a');
    expect(prisma.orders.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('DELETE /api/orders/[id] returns 404 for an invalid order ID without querying', async () => {
    actAs('user');
    const response = await deleteOrder(signedRequest(), { params: Promise.resolve({ id: 'abc' }) });

    expect(response.status).toBe(404);
    expect(findOrder).not.toHaveBeenCalled();
    expect(prisma.orders.delete).not.toHaveBeenCalled();
  });

  it("DELETE /api/orders/[id] does not cancel or delete another tenant's order", async () => {
    actAs('user');
    const response = await deleteOrder(signedRequest(), { params: Promise.resolve({ id: '900' }) });

    expect(response.status).toBe(404);
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(prisma.orders.delete).not.toHaveBeenCalled();
  });

  it("bulk DELETE /api/orders cancels each order with its string tenant ID", async () => {
    actAs('user');
    const response = await bulkDeleteOrders(signedRequest({ orderIds: [1, 101] }));

    expect(response.status).toBe(200);
    expect(cancelOrder.mock.calls).toEqual([
      ['AWB-1', 'North', 'client-a'],
      ['AWB-101', 'South', 'client-a'],
    ]);
    expect((prisma.orders.delete as jest.Mock).mock.calls.map(([args]) => args.where.id)).toEqual([1, 101]);
  });

  it("bulk DELETE /api/orders refuses the whole request when any order belongs to another tenant", async () => {
    actAs('user');
    const response = await bulkDeleteOrders(signedRequest({ orderIds: [1, 900] }));

    expect(response.status).toBe(404);
    expect(cancelOrder).not.toHaveBeenCalled();
    expect(prisma.orders.delete).not.toHaveBeenCalled();
  });
});
