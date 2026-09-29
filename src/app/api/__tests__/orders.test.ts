/**
 * /api/orders collection route: POST (create), GET (list), DELETE (bulk).
 * Focus: authentication, tenant isolation, the child-user sub-group rule,
 * server-owned fields, input validation, and the credit/Delhivery ordering
 * on create. Prisma, Delhivery, credits, analytics and webhooks are mocked.
 */
jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/delhivery', () => {
  const instance = { createOrder: jest.fn(), cancelOrder: jest.fn() };
  return { DelhiveryService: jest.fn(() => instance), __instance: instance };
});
jest.mock('@/lib/analytics-service', () => ({
  __esModule: true,
  default: { trackOrderCreation: jest.fn(), trackEvent: jest.fn() },
}));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn() } }));
jest.mock('@/lib/credit-service', () => ({
  CreditService: {
    getCreditCost: () => 1,
    deductCredits: jest.fn(),
    refundCredits: jest.fn(),
    attachOrderToTransaction: jest.fn(),
  },
  InsufficientCreditsError: class InsufficientCreditsError extends Error {
    constructor(public readonly required: number) {
      super('Insufficient credits');
      this.name = 'InsufficientCreditsError';
    }
  },
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';
import { WebhookService } from '@/lib/webhook-service';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';
import { POST as createOrder, GET as listOrders, DELETE as deleteOrders } from '@/app/api/orders/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const delhivery = jest.requireMock('@/lib/delhivery').__instance as { createOrder: jest.Mock; cancelOrder: jest.Mock };
const fetchMock = global.fetch as jest.Mock;

type OrderRow = Record<string, unknown> & { id: number; clientId: string };

const ORDERS: OrderRow[] = [
  { id: 1, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, courier_service: 'delhivery', tracking_id: 'AWB-1', pickup_location: 'a-wh', products: null },
  { id: 2, clientId: 'client-a', created_by: 'colleague', sub_group: 'north', courier_service: 'dtdc', tracking_id: null, pickup_location: 'a-wh', products: '[{"sku":"SKU-1","quantity":2}]' },
  { id: 3, clientId: 'client-a', created_by: 'colleague', sub_group: 'south', courier_service: 'dtdc', tracking_id: 'DT-3', pickup_location: 'a-wh', products: null },
  { id: 9, clientId: 'client-b', created_by: 'other-tenant-user', sub_group: null, courier_service: 'delhivery', tracking_id: 'AWB-9', pickup_location: 'b-wh', products: null },
];

const ORDER_URL = 'http://localhost/api/orders';

const VALID_ORDER = {
  name: 'Customer',
  mobile: '9876543210',
  address: '1 Main Road',
  city: 'Hyderabad',
  state: 'Telangana',
  country: 'India',
  pincode: '500001',
  courier_service: 'dtdc',
  pickup_location: 'a-wh',
  package_value: '1500.50',
  weight: '250',
  total_items: '2',
};

function actAs(role: string, { clientId = 'client-a', subGroup }: { clientId?: string; subGroup?: string } = {}) {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role, clientId));
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(subGroup ? { subGroups: { name: subGroup } } : null);
}

const post = (body: unknown, authenticated = true) => createOrder(signedRequest(body, { authenticated, url: ORDER_URL }));
const get = (query = '', authenticated = true) => listOrders(signedRequest({}, { authenticated, url: `${ORDER_URL}${query}` }));
const del = (body: unknown, authenticated = true) => deleteOrders(signedRequest(body, { authenticated, url: ORDER_URL }));

const lastWhere = (mock: jest.Mock) => mock.mock.calls[mock.mock.calls.length - 1][0].where;
const createdOrder = () => (prisma.orders.create as jest.Mock).mock.calls[0][0].data;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  (prisma.orders.findMany as jest.Mock).mockImplementation(async ({ where, skip = 0, take }) =>
    ORDERS.filter((row) => matchesWhere(row, where)).slice(skip, take === undefined ? undefined : skip + take)
  );
  (prisma.orders.count as jest.Mock).mockImplementation(async ({ where }) => ORDERS.filter((row) => matchesWhere(row, where)).length);
  (prisma.orders.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 101, ...data }));
  (prisma.orders.findUnique as jest.Mock).mockImplementation(async ({ where }) => ({ id: where.id, reference_number: 'REF' }));
  (prisma.orders.delete as jest.Mock).mockImplementation(async ({ where }) => ORDERS.find((row) => row.id === where.id));
  (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.user_custom_from_address.findUnique as jest.Mock).mockResolvedValue(null);

  (CreditService.deductCredits as jest.Mock).mockResolvedValue({ transactionId: 'txn-1' });
  (CreditService.refundCredits as jest.Mock).mockResolvedValue(undefined);
  (CreditService.attachOrderToTransaction as jest.Mock).mockResolvedValue(undefined);
  (WebhookService.triggerWebhooks as jest.Mock).mockResolvedValue(undefined);
  delhivery.createOrder.mockResolvedValue({ success: true, waybill_number: 'AWB-NEW', order_id: 'DLV-1' });
  delhivery.cancelOrder.mockResolvedValue({ success: true, message: 'cancelled' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/orders', () => {
  describe('authentication and validation', () => {
    it('rejects unauthenticated callers without charging or writing', async () => {
      const response = await post(VALID_ORDER, false);
      expect(response.status).toBe(401);
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
      expect(prisma.writeCalls()).toEqual([]);
    });

    it.each(Object.keys(VALID_ORDER))('rejects an order missing %s before charging', async (field) => {
      actAs('user');
      const response = await post({ ...VALID_ORDER, [field]: '' });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: `Missing required field: ${field}` });
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
      expect(prisma.writeCalls()).toEqual([]);
    });

    it.each(['12345', '5876543210', '98765432101', '+1 9876543210'])('rejects the mobile number %p', async (mobile) => {
      actAs('user');
      const response = await post({ ...VALID_ORDER, mobile });
      expect(response.status).toBe(400);
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
    });

    it('rejects a mobile number sent as a JSON number with 400, not a server error', async () => {
      actAs('user');
      const response = await post({ ...VALID_ORDER, mobile: 9876543210 });
      expect(response.status).toBe(400);
      expect(prisma.writeCalls()).toEqual([]);
    });

    it.each(['9876543210', '+91 98765 43210', '919876543210', '+91-0-9876543210'])('accepts the mobile number %p', async (mobile) => {
      actAs('user');
      expect((await post({ ...VALID_ORDER, mobile })).status).toBe(200);
    });

    it('rejects an invalid reseller mobile number', async () => {
      actAs('user');
      const response = await post({ ...VALID_ORDER, reseller_mobile: '123' });
      expect(response.status).toBe(400);
      expect((await response.json()).error).toMatch(/^Reseller mobile number/);
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
    });
  });

  describe('creating a non-Delhivery order', () => {
    it("stores the order in the caller's tenant and ignores server-owned fields from the body", async () => {
      actAs('user');
      const response = await post({
        ...VALID_ORDER,
        clientId: 'client-b',
        created_by: 'someone-else',
        sub_group: 'north',
        delhivery_api_status: 'success',
        id: 999,
      });

      expect(response.status).toBe(200);
      expect(createdOrder()).toMatchObject({ clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null });
      expect(createdOrder()).not.toHaveProperty('delhivery_api_status');
      expect(createdOrder()).not.toHaveProperty('id');
    });

    it("records a child user's sub-group", async () => {
      actAs('child_user', { subGroup: 'north' });
      await post(VALID_ORDER);
      expect(createdOrder()).toMatchObject({ created_by: TEST_USER_ID, sub_group: 'north' });
    });

    it('converts numeric fields and serialises products', async () => {
      actAs('user');
      const products = [{ sku: 'SKU-1', quantity: 2 }];
      await post({ ...VALID_ORDER, cod_amount: '99.5', products });

      expect(createdOrder()).toMatchObject({
        package_value: 1500.5,
        weight: 250,
        total_items: 2,
        cod_amount: 99.5,
        products: JSON.stringify(products),
      });
    });

    it('builds the reference number from a custom value or generates one', async () => {
      actAs('user');
      await post({ ...VALID_ORDER, reference_number: ' INV42 ' });
      expect(createdOrder().reference_number).toBe('INV42-9876543210');

      (prisma.orders.create as jest.Mock).mockClear();
      await post(VALID_ORDER);
      expect(createdOrder().reference_number).toMatch(/^[A-Z0-9]{6}-9876543210$/);

      (prisma.orders.create as jest.Mock).mockClear();
      (prisma.client_order_configs.findUnique as jest.Mock).mockResolvedValue({ enableReferencePrefix: false });
      await post(VALID_ORDER);
      expect(createdOrder().reference_number).toBe('9876543210');
      expect(prisma.client_order_configs.findUnique).toHaveBeenCalledWith({ where: { clientId: 'client-a' } });
    });

    it('keeps a caller-supplied tracking id and marks untracked orders pending', async () => {
      actAs('user');
      await post({ ...VALID_ORDER, tracking_id: 'DT-777' });
      expect(createdOrder()).toMatchObject({ tracking_id: 'DT-777', tracking_status: null });

      (prisma.orders.create as jest.Mock).mockClear();
      await post(VALID_ORDER);
      expect(createdOrder()).toMatchObject({ tracking_id: null, tracking_status: 'pending' });
      expect(delhivery.createOrder).not.toHaveBeenCalled();
    });

    it('charges one order credit, links it to the order and returns the order summary', async () => {
      actAs('user');
      const response = await post(VALID_ORDER);
      const body = await response.json();

      expect(CreditService.deductCredits).toHaveBeenCalledWith('client-a', 1, 'Order creation', 'ORDER', TEST_USER_ID);
      expect(CreditService.attachOrderToTransaction).toHaveBeenCalledWith('txn-1', 101);
      expect(CreditService.refundCredits).not.toHaveBeenCalled();
      expect(body).toMatchObject({ success: true, order: { id: 101, orderNumber: 'ORDER-101' } });
    });

    it("fires order.created webhooks for the caller's tenant", async () => {
      actAs('user');
      await post(VALID_ORDER);
      expect(WebhookService.triggerWebhooks).toHaveBeenCalledWith('order.created', expect.any(Object), 'client-a', 101);
    });

    it("applies the user's custom from-address when the courier matches", async () => {
      actAs('user');
      (prisma.user_custom_from_address.findUnique as jest.Mock).mockResolvedValue({
        overwriteFromAddress: true,
        courierServiceCode: 'DTDC',
        customAddress: 'Custom Warehouse, Pune',
      });
      await post(VALID_ORDER);
      expect(prisma.user_custom_from_address.findUnique).toHaveBeenCalledWith({ where: { userId: TEST_USER_ID } });
      expect(createdOrder().seller_address).toBe('Custom Warehouse, Pune');
    });

    it('returns 402 without creating anything when credits run out', async () => {
      actAs('user');
      (CreditService.deductCredits as jest.Mock).mockRejectedValue(new InsufficientCreditsError(1));
      const response = await post(VALID_ORDER);

      expect(response.status).toBe(402);
      expect((await response.json()).error).toBe('Insufficient credits');
      expect(prisma.orders.create).not.toHaveBeenCalled();
    });

    it('refunds the credit when the order cannot be saved', async () => {
      actAs('user');
      (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('db down'));
      const response = await post(VALID_ORDER);

      expect(response.status).toBe(500);
      expect(CreditService.refundCredits).toHaveBeenCalledWith('client-a', 1, expect.stringMatching(/^Refund:/), 'ORDER', TEST_USER_ID);
      expect(delhivery.cancelOrder).not.toHaveBeenCalled();
    });
  });

  describe('creating a DTDC order', () => {
    // DTDC numbers live in client_config as comma-separated unused/used lists
    let slipConfig: Map<string, string>;
    const slips = () => ({ unused: slipConfig.get('dtdc_slips_unused'), used: slipConfig.get('dtdc_slips_used') });

    beforeEach(() => {
      slipConfig = new Map([['dtdc_slips_unused', 'D100, D101'], ['dtdc_slips_used', 'D099']]);
      (prisma.client_config.findMany as jest.Mock).mockImplementation(async ({ where }) =>
        [...slipConfig.entries()].filter(([key]) => where.key.in.includes(key)).map(([key, value]) => ({ key, value }))
      );
      (prisma.client_config.updateMany as jest.Mock).mockImplementation(async ({ where, data }) => {
        if (!slipConfig.has(where.key) || ('value' in where && slipConfig.get(where.key) !== where.value)) return { count: 0 };
        slipConfig.set(where.key, data.value);
        return { count: 1 };
      });
    });

    const DTDC_ORDER = { ...VALID_ORDER, courier_service: 'dtdc' };

    it('moves the submitted number from unused to used on the server', async () => {
      actAs('user');
      const response = await post({ ...DTDC_ORDER, waybill: 'D100' });
      expect(response.status).toBe(200);
      expect(createdOrder().tracking_id).toBe('D100');
      expect(slips()).toEqual({ unused: 'D101', used: 'D099, D100' });
    });

    it('refuses a number another order already used, without charging', async () => {
      actAs('user');
      const response = await post({ ...DTDC_ORDER, waybill: 'D099' });
      expect(response.status).toBe(409);
      expect((await response.json()).error).toBe('DTDC tracking number D099 has already been used');
      expect(CreditService.deductCredits).not.toHaveBeenCalled();
      expect(prisma.orders.create).not.toHaveBeenCalled();
    });

    it('refuses the second of two orders that were shown the same number', async () => {
      actAs('user');
      expect((await post({ ...DTDC_ORDER, waybill: 'D100' })).status).toBe(200);
      expect((await post({ ...DTDC_ORDER, waybill: 'D100' })).status).toBe(409);
      expect(prisma.orders.create).toHaveBeenCalledTimes(1);
    });

    it('accepts a number from outside the lists and leaves the lists alone', async () => {
      actAs('user');
      expect((await post({ ...DTDC_ORDER, waybill: 'MANUAL-7' })).status).toBe(200);
      expect(createdOrder().tracking_id).toBe('MANUAL-7');
      expect(slips()).toEqual({ unused: 'D100, D101', used: 'D099' });
    });

    it('does not assign a number when the form leaves it empty', async () => {
      actAs('user');
      expect((await post(DTDC_ORDER)).status).toBe(200);
      expect(createdOrder().tracking_id).toBeNull();
      expect(slips().unused).toBe('D100, D101');
    });

    it('returns the number to the unused list when credits are insufficient', async () => {
      actAs('user');
      (CreditService.deductCredits as jest.Mock).mockRejectedValue(new InsufficientCreditsError(1));
      expect((await post({ ...DTDC_ORDER, waybill: 'D101' })).status).toBe(402);
      expect(slips()).toEqual({ unused: 'D101, D100', used: 'D099' });
    });

    it('returns the number when the order cannot be saved', async () => {
      actAs('user');
      (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('db down'));
      expect((await post({ ...DTDC_ORDER, waybill: 'D100' })).status).toBe(500);
      expect(slips()).toEqual({ unused: 'D100, D101', used: 'D099' });
    });
  });

  describe('creating a Delhivery order', () => {
    const DELHIVERY_ORDER = { ...VALID_ORDER, courier_service: 'Delhivery' };

    it('returns the waybill and booking status saved after booking, not the pre-booking row', async () => {
      actAs('user');
      (prisma.orders.findUnique as jest.Mock).mockImplementation(async ({ where }) => ({
        id: where.id,
        reference_number: 'REF',
        tracking_id: 'AWB-NEW',
        delhivery_api_status: 'success',
      }));
      const body = await (await post(DELHIVERY_ORDER)).json();
      expect(body.order).toMatchObject({ trackingId: 'AWB-NEW', delhiveryStatus: 'success' });
    });

    it('charges first, books with Delhivery, then stores the waybill on the new order', async () => {
      actAs('user');
      const response = await post({ ...DELHIVERY_ORDER, tracking_id: 'CALLER-AWB' });

      expect(response.status).toBe(200);
      const deductOrder = (CreditService.deductCredits as jest.Mock).mock.invocationCallOrder[0];
      const bookOrder = delhivery.createOrder.mock.invocationCallOrder[0];
      const saveOrder = (prisma.orders.create as jest.Mock).mock.invocationCallOrder[0];
      expect(deductOrder).toBeLessThan(bookOrder);
      expect(bookOrder).toBeLessThan(saveOrder);

      expect(delhivery.createOrder.mock.calls[0][0]).toMatchObject({ clientId: 'client-a', tracking_id: null });
      expect(createdOrder().tracking_id).toBeNull();
      expect(prisma.orders.update).toHaveBeenCalledWith({
        where: { id: 101 },
        data: expect.objectContaining({
          delhivery_waybill_number: 'AWB-NEW',
          delhivery_order_id: 'DLV-1',
          delhivery_api_status: 'success',
          tracking_id: 'AWB-NEW',
          tracking_status: 'manifested',
        }),
      });
    });

    it.each([
      ['reports a failure', () => delhivery.createOrder.mockResolvedValue({ success: false, error: 'Pincode not serviceable' })],
      ['throws', () => delhivery.createOrder.mockRejectedValue(new Error('timeout'))],
    ])('refunds and creates no order when Delhivery %s', async (_case, arrange) => {
      actAs('user');
      arrange();
      const response = await post(DELHIVERY_ORDER);

      expect(response.status).toBe(400);
      expect((await response.json()).error).toBe('Delhivery API failed');
      expect(CreditService.refundCredits).toHaveBeenCalledTimes(1);
      expect(prisma.orders.create).not.toHaveBeenCalled();
    });

    it('cancels the booked waybill and refunds when the order cannot be saved', async () => {
      actAs('user');
      (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('db down'));
      const response = await post(DELHIVERY_ORDER);

      expect(response.status).toBe(500);
      expect(delhivery.cancelOrder).toHaveBeenCalledWith('AWB-NEW', 'a-wh', 'client-a');
      expect(CreditService.refundCredits).toHaveBeenCalledTimes(1);
    });

    it('keeps the charge when the order exists but storing carrier details fails', async () => {
      actAs('user');
      (prisma.orders.update as jest.Mock).mockRejectedValue(new Error('db hiccup'));
      const response = await post(DELHIVERY_ORDER);

      expect(response.status).toBe(500);
      expect(await response.json()).toMatchObject({ orderId: 101, waybill: 'AWB-NEW' });
      expect(CreditService.refundCredits).not.toHaveBeenCalled();
      expect(delhivery.cancelOrder).not.toHaveBeenCalled();
      expect(CreditService.attachOrderToTransaction).toHaveBeenCalledWith('txn-1', 101);
    });

    it('skips the Delhivery booking when skip_tracking is set', async () => {
      actAs('user');
      const response = await post({ ...DELHIVERY_ORDER, skip_tracking: true });
      expect(response.status).toBe(200);
      expect(delhivery.createOrder).not.toHaveBeenCalled();
      expect(createdOrder()).toMatchObject({ tracking_id: null, tracking_status: 'pending' });
    });
  });
});

describe('GET /api/orders', () => {
  const ids = async (response: { json: () => Promise<any> }) => (await response.json()).orders.map((o: OrderRow) => o.id);

  it('rejects unauthenticated callers', async () => {
    const response = await get('', false);
    expect(response.status).toBe(401);
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
  });

  it.each(['user', 'client_admin', 'super_admin'])("limits %s callers to their own tenant's orders", async (role) => {
    actAs(role);
    const response = await get();
    expect(response.status).toBe(200);
    expect(await ids(response)).toEqual([1, 2, 3]);
    expect(lastWhere(prisma.orders.findMany as jest.Mock)).toEqual({ clientId: 'client-a' });
    expect(lastWhere(prisma.orders.count as jest.Mock)).toEqual({ clientId: 'client-a' });
  });

  it('shows the other tenant only its own orders', async () => {
    actAs('user', { clientId: 'client-b' });
    expect(await ids(await get())).toEqual([9]);
  });

  it('limits child users to their sub-group or their own orders', async () => {
    actAs('child_user', { subGroup: 'north' });
    expect(await ids(await get())).toEqual([1, 2]);
  });

  it('limits child users without a sub-group to their own orders', async () => {
    actAs('child_user');
    expect(await ids(await get())).toEqual([1]);
  });

  it('falls back to own orders when the sub-group lookup fails', async () => {
    actAs('child_user');
    (prisma.user_sub_groups.findFirst as jest.Mock).mockRejectedValue(new Error('db hiccup'));
    expect(await ids(await get())).toEqual([1]);
  });

  it('builds a case-insensitive search within the tenant', async () => {
    actAs('user');
    await get('?search=AWB');
    expect(lastWhere(prisma.orders.findMany as jest.Mock)).toEqual({
      clientId: 'client-a',
      OR: ['name', 'mobile', 'tracking_id', 'reference_number'].map((field) => ({ [field]: { contains: 'AWB', mode: 'insensitive' } })),
    });
  });

  it("keeps a child user's restriction when searching", async () => {
    actAs('child_user', { subGroup: 'north' });
    await get('?search=AWB');
    const where = lastWhere(prisma.orders.findMany as jest.Mock);

    expect(where.clientId).toBe('client-a');
    expect(where.OR).toBeUndefined();
    expect(where.AND).toEqual([
      { OR: [{ sub_group: 'north' }, { created_by: TEST_USER_ID }] },
      { OR: expect.arrayContaining([{ name: { contains: 'AWB', mode: 'insensitive' } }]) },
    ]);
  });

  it("keeps a child user's restriction when filtering for pending orders", async () => {
    actAs('child_user', { subGroup: 'north' });
    await get('?trackingStatus=pending');
    const where = lastWhere(prisma.orders.findMany as jest.Mock);

    expect(where.AND[0]).toEqual({ OR: [{ sub_group: 'north' }, { created_by: TEST_USER_ID }] });
    expect(where.AND[1].OR).toEqual(expect.arrayContaining([{ tracking_status: 'pending' }, { tracking_id: null }]));
  });

  it('cannot widen access through the subGroup filter', async () => {
    actAs('child_user', { subGroup: 'north' });
    expect(await ids(await get('?subGroup=south'))).toEqual([]);
  });

  it('applies pickup location, courier, status and date filters', async () => {
    actAs('user');
    await get('?pickupLocation=a-wh&courierService=dtdc&trackingStatus=delivered&fromDate=2024-01-01&toDate=2024-01-31');
    expect(lastWhere(prisma.orders.findMany as jest.Mock)).toEqual({
      clientId: 'client-a',
      pickup_location: 'a-wh',
      courier_service: 'dtdc',
      tracking_status: 'delivered',
      created_at: { gte: new Date('2024-01-01'), lte: new Date('2024-01-31T23:59:59.999Z') },
    });
  });

  it('paginates and parses stored products', async () => {
    actAs('user');
    const response = await get('?page=2&limit=1');
    const body = await response.json();

    expect((prisma.orders.findMany as jest.Mock).mock.calls[0][0]).toMatchObject({ skip: 1, take: 1, orderBy: { created_at: 'desc' } });
    expect(body.orders).toEqual([expect.objectContaining({ id: 2, products: [{ sku: 'SKU-1', quantity: 2 }] })]);
    expect(body.pagination).toEqual({ currentPage: 2, totalPages: 3, totalCount: 3, hasNextPage: true, hasPrevPage: true });
  });

  it('returns 500 when the query fails', async () => {
    actAs('user');
    (prisma.orders.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    const response = await get();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to fetch orders' });
  });
});

describe('DELETE /api/orders', () => {
  const deletedIds = () => (prisma.orders.delete as jest.Mock).mock.calls.map(([args]) => args.where.id);

  it('rejects unauthenticated callers', async () => {
    const response = await del({ orderIds: [1] }, false);
    expect(response.status).toBe(401);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each([[{}], [{ orderIds: [] }], [{ orderIds: '1' }]])('requires a non-empty orderIds array (%p)', async (body) => {
    actAs('user');
    const response = await del(body);
    expect(response.status).toBe(400);
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
  });

  it.each([[[1, 'abc']], [[0]], [[-3]], [['12abc']], [[1.5]], [[null]]])('rejects invalid order ids %p', async (orderIds) => {
    actAs('user');
    const response = await del({ orderIds });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'All order IDs must be valid positive integers' });
    expect(prisma.writeCalls()).toEqual([]);
  });

  it("refuses to delete another tenant's order, even alongside the caller's own", async () => {
    actAs('client_admin');
    const response = await del({ orderIds: [1, 9] });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Some orders not found or do not belong to your client' });
    expect(lastWhere(prisma.orders.findMany as jest.Mock)).toMatchObject({ clientId: 'client-a' });
    expect(prisma.writeCalls()).toEqual([]);
    expect(delhivery.cancelOrder).not.toHaveBeenCalled();
  });

  it('limits child users to orders in their sub-group or their own', async () => {
    actAs('child_user', { subGroup: 'north' });
    const denied = await del({ orderIds: [3] });
    expect(denied.status).toBe(404);
    expect(await denied.json()).toEqual({ error: 'Some orders not found or you do not have permission to delete them' });
    expect(prisma.writeCalls()).toEqual([]);

    const allowed = await del({ orderIds: [1, 2] });
    expect(allowed.status).toBe(200);
    expect(deletedIds()).toEqual([1, 2]);
  });

  it("deletes the caller's orders and cancels their Delhivery waybills with the order tenant", async () => {
    actAs('user');
    const response = await del({ orderIds: [1, 3] });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(deletedIds()).toEqual([1, 3]);
    expect(delhivery.cancelOrder).toHaveBeenCalledTimes(1);
    expect(delhivery.cancelOrder).toHaveBeenCalledWith('AWB-1', 'a-wh', 'client-a');
    expect(body).toMatchObject({
      success: true,
      deletedCount: 2,
      delhiveryCancellations: [{ orderId: 1, waybill: 'AWB-1', success: true }],
    });
  });

  it('still deletes when a Delhivery cancellation fails, and reports it', async () => {
    actAs('user');
    delhivery.cancelOrder.mockRejectedValue(new Error('carrier down'));
    const body = await (await del({ orderIds: [1] })).json();

    expect(deletedIds()).toEqual([1]);
    expect(body.delhiveryCancellations).toEqual([{ orderId: 1, waybill: 'AWB-1', success: false, message: 'Error cancelling Delhivery order' }]);
  });

  it('deletes orders with stored products without calling any inventory service', async () => {
    actAs('user');
    const body = await (await del({ orderIds: [2] })).json();

    expect(deletedIds()).toEqual([2]);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(body).not.toHaveProperty('inventoryRestorations');
  });

  it('returns 500 when the delete transaction fails', async () => {
    actAs('user');
    (prisma.orders.delete as jest.Mock).mockRejectedValue(new Error('db down'));
    const response = await del({ orderIds: [1] });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Failed to delete orders' });
  });
});
