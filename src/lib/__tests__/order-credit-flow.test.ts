jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/delhivery', () => {
  const createOrder = jest.fn();
  const cancelOrder = jest.fn();
  return {
    delhiveryService: { createOrder, cancelOrder },
    DelhiveryService: jest.fn().mockImplementation(() => ({ createOrder, cancelOrder })),
    DelhiveryOutcomeUnknownError: class DelhiveryOutcomeUnknownError extends Error {},
  };
});
jest.mock('@/lib/credit-service', () => {
  const actual = jest.requireActual('@/lib/credit-service');
  return {
    ...actual,
    CreditService: {
      getCreditCost: actual.CreditService.getCreditCost,
      deductCredits: jest.fn(),
      refundCredits: jest.fn(),
      attachOrderToTransaction: jest.fn(),
      // Pre-fix API, kept so the old handlers run realistically in before/after checks
      hasSufficientCredits: jest.fn().mockResolvedValue(true),
      deductOrderCredits: jest.fn().mockResolvedValue(undefined),
    },
  };
});
jest.mock('@/lib/analytics-service', () => ({ __esModule: true, default: { trackOrderCreation: jest.fn(), trackEvent: jest.fn() } }));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn().mockResolvedValue(undefined) } }));

import fs from 'node:fs';
import { prisma as realPrisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as createOrderRoute } from '@/app/api/orders/route';

jest.unmock('path');
const { join } = jest.requireActual('path');

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const credits = CreditService as unknown as Record<'deductCredits' | 'refundCredits' | 'attachOrderToTransaction', jest.Mock>;
const createDelhiveryOrder = delhiveryService.createOrder as jest.Mock;
const cancelDelhiveryOrder = delhiveryService.cancelOrder as jest.Mock;

const ORDER_INPUT = {
  name: 'Asha',
  mobile: '9876543210',
  address: '12 MG Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  pincode: '560001',
  courier_service: 'delhivery',
  pickup_location: 'north',
  package_value: '500',
  weight: '250',
  total_items: '1',
};

function order(overrides: Record<string, unknown> = {}) {
  return signedRequest({ ...ORDER_INPUT, ...overrides });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('user'));
  credits.deductCredits.mockResolvedValue({ balance: 9, transactionId: 'txn-charge' });
  credits.refundCredits.mockResolvedValue({ balance: 10 });
  credits.attachOrderToTransaction.mockResolvedValue(undefined);
  createDelhiveryOrder.mockResolvedValue({ success: true, waybill_number: 'WB-1', order_id: 'DL-1' });
  cancelDelhiveryOrder.mockResolvedValue({ success: true });
  (prisma.orders.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 501, ...data }));
  (prisma.orders.update as jest.Mock).mockImplementation(async ({ where, data }) => ({ id: where.id, ...data }));
  (prisma.orders.findUnique as jest.Mock).mockImplementation(async ({ where }) => ({ id: where.id, ...ORDER_INPUT }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/orders credit handling', () => {
  it('charges before booking, then links the charge to the new order', async () => {
    const response = await createOrderRoute(order());

    expect(response.status).toBe(200);
    expect(credits.deductCredits).toHaveBeenCalledWith('client-a', 1, 'Order creation', 'ORDER', TEST_USER_ID);
    expect(credits.deductCredits.mock.invocationCallOrder[0]).toBeLessThan(createDelhiveryOrder.mock.invocationCallOrder[0]);
    expect(credits.attachOrderToTransaction).toHaveBeenCalledWith('txn-charge', 501);
    expect(credits.refundCredits).not.toHaveBeenCalled();
  });

  it('charges and creates non-Delhivery orders without calling Delhivery', async () => {
    const response = await createOrderRoute(order({ courier_service: 'dtdc' }));

    expect(response.status).toBe(200);
    expect(createDelhiveryOrder).not.toHaveBeenCalled();
    expect(prisma.orders.update).not.toHaveBeenCalled();
    expect(credits.attachOrderToTransaction).toHaveBeenCalledWith('txn-charge', 501);
  });

  it('returns 402 and books nothing when the balance is too low', async () => {
    credits.deductCredits.mockRejectedValue(new InsufficientCreditsError(1));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(402);
    expect(createDelhiveryOrder).not.toHaveBeenCalled();
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('returns 500 and books nothing when charging fails for another reason', async () => {
    credits.deductCredits.mockRejectedValue(new Error('Failed to deduct credits'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(500);
    expect(createDelhiveryOrder).not.toHaveBeenCalled();
  });

  it('does not charge for requests that fail validation', async () => {
    const response = await createOrderRoute(order({ mobile: '12345' }));
    expect(response.status).toBe(400);
    expect(credits.deductCredits).not.toHaveBeenCalled();
  });

  it('refunds when Delhivery rejects the booking', async () => {
    createDelhiveryOrder.mockResolvedValue({ success: false, error: 'pincode not serviceable' });

    const response = await createOrderRoute(order());

    expect(response.status).toBe(400);
    expect(credits.refundCredits).toHaveBeenCalledWith('client-a', 1, 'Refund: Delhivery booking failed', 'ORDER', TEST_USER_ID);
    expect(prisma.orders.create).not.toHaveBeenCalled();
  });

  it('refunds when the Delhivery call throws', async () => {
    createDelhiveryOrder.mockRejectedValue(new Error('timeout'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(400);
    expect(credits.refundCredits).toHaveBeenCalledTimes(1);
  });

  it('cancels the waybill and refunds when the order cannot be saved after booking', async () => {
    (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('unique constraint'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(500);
    expect(cancelDelhiveryOrder).toHaveBeenCalledWith('WB-1', 'north', 'client-a');
    expect(credits.refundCredits).toHaveBeenCalledWith('client-a', 1, 'Refund: order could not be saved', 'ORDER', TEST_USER_ID);
  });

  it('still refunds, and logs for reconciliation, when the waybill cannot be cancelled', async () => {
    (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('unique constraint'));
    cancelDelhiveryOrder.mockResolvedValue({ success: false, error: 'already manifested' });

    await createOrderRoute(order());

    expect(credits.refundCredits).toHaveBeenCalledTimes(1);
    const logged = (console.error as jest.Mock).mock.calls.map(([message]) => String(message)).join(' ');
    expect(logged).toContain('Waybill cancellation failed');
  });

  it('refunds without cancelling anything for non-Delhivery orders that cannot be saved', async () => {
    (prisma.orders.create as jest.Mock).mockRejectedValue(new Error('db down'));

    await createOrderRoute(order({ courier_service: 'dtdc' }));

    expect(createDelhiveryOrder).not.toHaveBeenCalled();
    expect(cancelDelhiveryOrder).not.toHaveBeenCalled();
    expect(credits.refundCredits).toHaveBeenCalledTimes(1);
  });

  it('keeps the charge and reports the order when only saving carrier details fails', async () => {
    (prisma.orders.update as jest.Mock).mockRejectedValue(new Error('db timeout'));

    const response = await createOrderRoute(order());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toMatchObject({ orderId: 501, waybill: 'WB-1' });
    expect(credits.refundCredits).not.toHaveBeenCalled();
    expect(cancelDelhiveryOrder).not.toHaveBeenCalled();
    expect(credits.attachOrderToTransaction).toHaveBeenCalledWith('txn-charge', 501);
  });

  it('logs, but does not fail the order, when the refund itself fails', async () => {
    createDelhiveryOrder.mockResolvedValue({ success: false, error: 'rejected' });
    credits.refundCredits.mockRejectedValue(new Error('db down'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(400);
    const logged = (console.error as jest.Mock).mock.calls.map(([message]) => String(message)).join(' ');
    expect(logged).toContain('Credit refund failed; reconcile manually');
  });

  it('logs, but does not fail the order, when the charge cannot be linked', async () => {
    credits.attachOrderToTransaction.mockRejectedValue(new Error('db down'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(200);
    const logged = (console.error as jest.Mock).mock.calls.map(([message]) => String(message)).join(' ');
    expect(logged).toContain('Could not link credit charge to order');
  });

  it('logs when the charge cannot be linked after a carrier-details failure', async () => {
    (prisma.orders.update as jest.Mock).mockRejectedValue(new Error('db timeout'));
    credits.attachOrderToTransaction.mockRejectedValue(new Error('db down'));

    const response = await createOrderRoute(order());

    expect(response.status).toBe(500);
    const logged = (console.error as jest.Mock).mock.calls.map(([message]) => String(message)).join(' ');
    expect(logged).toContain('Could not link credit charge to order');
  });

  it('no longer deducts after the order is created', () => {
    const source = fs.readFileSync(join(__dirname, '..', '..', 'app', 'api', 'orders', 'route.ts'), 'utf8');
    expect(source).not.toContain('deductOrderCredits');
    expect(source).not.toContain("We don't fail the order creation if credit deduction fails");
  });
});

describe('order creation field allowlist', () => {
  const PROTECTED = {
    clientId: 'client-b',
    created_by: 'attacker',
    sub_group: 'someone-elses-group',
    delhivery_api_status: 'success',
    delhivery_waybill_number: 'FAKE',
    tracking_status: 'delivered',
    shopify_status: 'fulfilled',
    seller_address: 'Injected seller',
    created_at: '2020-01-01',
    id: 999,
  };

  function created() {
    return (prisma.orders.create as jest.Mock).mock.calls[0][0].data;
  }

  it('POST /api/orders ignores fields the server controls', async () => {
    const response = await createOrderRoute(order({ courier_service: 'dtdc', ...PROTECTED }));

    expect(response.status).toBe(200);
    const data = created();
    expect(data).toMatchObject({ clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, tracking_status: 'pending' });
    for (const field of ['delhivery_api_status', 'delhivery_waybill_number', 'shopify_status', 'seller_address', 'id']) {
      expect(data).not.toHaveProperty(field);
    }
    expect(data.created_at).not.toBe('2020-01-01');
  });

  it('POST /api/orders keeps allowed fields and maps waybill to tracking_id without storing control flags', async () => {
    await createOrderRoute(order({ courier_service: 'dtdc', product_description: 'Earrings', shipment_length: 10, waybill: 'WB-OWN', skip_tracking: true, creationPattern: 'manual' }));

    const data = created();
    expect(data).toMatchObject({ product_description: 'Earrings', shipment_length: 10, tracking_id: 'WB-OWN' });
    for (const field of ['waybill', 'skip_tracking', 'creationPattern']) {
      expect(data).not.toHaveProperty(field);
    }
  });

  it('POST /api/orders ignores caller-supplied tracking ids on Delhivery bookings', async () => {
    await createOrderRoute(order({ tracking_id: 'AWB-HIJACK', waybill: 'AWB-HIJACK', delhivery_waybill_number: 'AWB-HIJACK' }));
    const data = created();
    expect(data.tracking_id).toBeNull();
    expect(data).not.toHaveProperty('delhivery_waybill_number');
  });
});
