jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: { findUnique: jest.fn((args) => require('@/test-utils/auth-request').liveSessionFor(args)) },
    users: { findUnique: jest.fn() },
    user_sub_groups: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn(), update: jest.fn() },
  },
}));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/delhivery', () => ({
  delhiveryService: { createOrder: jest.fn() },
  DelhiveryOutcomeUnknownError: class DelhiveryOutcomeUnknownError extends Error {},
}));
jest.mock('@/lib/webhook-service', () => ({ WebhookService: { triggerWebhooks: jest.fn() } }));
jest.mock('@/lib/credit-service', () => {
  const actual = jest.requireActual('@/lib/credit-service');
  return {
    ...actual,
    CreditService: {
      getCreditCost: actual.CreditService.getCreditCost,
      chargeOrderBookingIfNeeded: jest.fn(),
      refundCredits: jest.fn(),
    },
  };
});

import { prisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';
import { authUserRow, signedRequest } from '@/test-utils/auth-request';
import { matchesWhere } from '@/test-utils/prisma-where';
import { POST as fulfillOrder } from '@/app/api/orders/[id]/fulfill/route';
import { POST as retryDelhivery } from '@/app/api/orders/[id]/retry-delhivery/route';

const ORDERS = [
  { id: 1, clientId: 'client-a', created_by: 'user-1', sub_group: null, pickup_location: 'a-warehouse', courier_service: 'delhivery', tracking_id: null, delhivery_api_status: 'pending', delhivery_retry_count: 0, reference_number: 'REF-1' },
  { id: 4, clientId: 'client-a', created_by: 'user-1', sub_group: null, pickup_location: 'a-warehouse', courier_service: 'delhivery', tracking_id: 'AWB-A4', delhivery_api_status: 'success', delhivery_retry_count: 0, reference_number: 'REF-4' },
];

const charge = CreditService.chargeOrderBookingIfNeeded as jest.Mock;
const refund = CreditService.refundCredits as jest.Mock;

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('user'));
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.orders.findFirst as jest.Mock).mockImplementation(async ({ where }: { where: unknown }) =>
    ORDERS.find((row) => matchesWhere(row, where as never)) ?? null
  );
  (prisma.orders.update as jest.Mock).mockResolvedValue({});
  charge.mockResolvedValue({ didCharge: true, transactionId: 'txn-new' });
  refund.mockResolvedValue({});
  (delhiveryService.createOrder as jest.Mock).mockResolvedValue({ success: true, waybill_number: 'WB-NEW', order_id: 'DL-1' });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('fulfill and retry credit charging', () => {
  it('charges before booking a previously unbilled order', async () => {
    const response = await fulfillOrder(signedRequest(), params('1'));
    expect(response.status).toBe(200);
    expect(charge).toHaveBeenCalledWith('client-a', 'user-1', 1);
    expect(charge.mock.invocationCallOrder[0]).toBeLessThan((delhiveryService.createOrder as jest.Mock).mock.invocationCallOrder[0]);
    expect(refund).not.toHaveBeenCalled();
  });

  it('does not book when the tenant has no credits', async () => {
    charge.mockRejectedValue(new InsufficientCreditsError(1));
    const response = await fulfillOrder(signedRequest(), params('1'));
    expect(response.status).toBe(402);
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });

  it('does not charge an order that is already fulfilled', async () => {
    const response = await fulfillOrder(signedRequest(), params('4'));
    expect(response.status).toBe(400);
    expect(charge).not.toHaveBeenCalled();
    expect(delhiveryService.createOrder).not.toHaveBeenCalled();
  });

  it('refunds a new charge when Delhivery rejects fulfillment', async () => {
    (delhiveryService.createOrder as jest.Mock).mockResolvedValue({ success: false, error: 'rejected' });
    const response = await fulfillOrder(signedRequest(), params('1'));
    expect(response.status).toBe(500);
    expect(refund).toHaveBeenCalledWith('client-a', 1, 'Refund: Delhivery booking failed', 'ORDER', 'user-1', 1);
  });

  it('does not refund when the order was already billed at create time', async () => {
    charge.mockResolvedValue({ didCharge: false, transactionId: 'txn-create' });
    (delhiveryService.createOrder as jest.Mock).mockResolvedValue({ success: false, error: 'rejected' });
    await fulfillOrder(signedRequest(), params('1'));
    expect(refund).not.toHaveBeenCalled();
  });

  it('charges retry the same way and refunds a new charge on failure', async () => {
    (delhiveryService.createOrder as jest.Mock).mockRejectedValue(new Error('timeout'));
    const response = await retryDelhivery(signedRequest(), params('1'));
    expect(response.status).toBe(500);
    expect(charge).toHaveBeenCalledWith('client-a', 'user-1', 1);
    expect(refund).toHaveBeenCalled();
  });
});
