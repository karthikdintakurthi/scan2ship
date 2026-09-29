jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as delhiveryWebhook } from '@/app/api/webhooks/delhivery/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const fetchMock = global.fetch as jest.Mock;
const SECRET = 'whsec-test-0123456789';

function deliver(body: unknown, { header = SECRET as string | null, token = null as string | null } = {}) {
  const url = new URL(`http://localhost/api/webhooks/delhivery${token ? `?token=${token}` : ''}`);
  return delhiveryWebhook({
    json: async () => body,
    nextUrl: url,
    headers: { get: (name: string) => (name.toLowerCase() === 'x-webhook-secret' ? header : null) },
  } as unknown as NextRequest);
}

const SHIPPED = { tracking_data: { awb: 'AWB-1', status: 'shipped' } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  process.env.DELHIVERY_WEBHOOK_SECRET = SECRET;
  (prisma.orders.findMany as jest.Mock).mockResolvedValue([{ id: 10, clientId: 'client-a' }]);
  (prisma.orders.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
});

afterEach(() => {
  delete process.env.DELHIVERY_WEBHOOK_SECRET;
  jest.restoreAllMocks();
});

describe('webhook secret', () => {
  it('rejects every request when no secret is configured', async () => {
    delete process.env.DELHIVERY_WEBHOOK_SECRET;
    const response = await deliver(SHIPPED);
    expect(response.status).toBe(503);
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
  });

  it.each([
    ['a missing secret', { header: null }],
    ['a wrong secret', { header: 'whsec-test-9999999999' }],
    ['a secret of a different length', { header: 'short' }],
  ])('rejects %s', async (_label, options) => {
    const response = await deliver(SHIPPED, options);
    expect(response.status).toBe(401);
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
    expect(prisma.orders.updateMany).not.toHaveBeenCalled();
  });

  it('accepts the secret as a query token', async () => {
    const response = await deliver(SHIPPED, { header: null, token: SECRET });
    expect(response.status).toBe(200);
  });
});

describe('POST /api/webhooks/delhivery', () => {
  it.each(['Shipped', 'dispatched', 'IN_TRANSIT'])('marks the single matching Delhivery order as shipped for status %p', async (status) => {
    const response = await deliver({ tracking_data: { awb: 'AWB-1', status } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true });
    expect((prisma.orders.findMany as jest.Mock).mock.calls[0][0].where).toEqual({
      tracking_id: 'AWB-1',
      courier_service: { equals: 'delhivery', mode: 'insensitive' },
    });
    expect(prisma.orders.updateMany).toHaveBeenCalledWith({
      where: { id: 10, clientId: 'client-a' },
      data: { delhivery_api_status: 'shipped', updated_at: expect.any(Date) },
    });
  });

  it('does not update anything when the waybill matches orders in more than one tenant', async () => {
    (prisma.orders.findMany as jest.Mock).mockResolvedValue([{ id: 10, clientId: 'client-a' }, { id: 20, clientId: 'client-b' }]);

    const response = await deliver(SHIPPED);

    expect(response.status).toBe(409);
    expect(prisma.orders.updateMany).not.toHaveBeenCalled();
  });

  it('returns 404 when no Delhivery order has the waybill', async () => {
    (prisma.orders.findMany as jest.Mock).mockResolvedValue([]);
    expect((await deliver(SHIPPED)).status).toBe(404);
    expect(prisma.orders.updateMany).not.toHaveBeenCalled();
  });

  it('never calls Shopify or any other external service, and does not log the payload', async () => {
    await deliver({ tracking_data: { order_id: '12345', awb: 'AWB-1', status: 'shipped', consignee: 'Asha, 12 Secret Street' } });
    expect(fetchMock).not.toHaveBeenCalled();
    const logged = (console.log as jest.Mock).mock.calls.flat().map(String).join(' ');
    expect(logged).not.toContain('Secret Street');
  });

  it.each([['delivered'], ['RTO'], [undefined], [42]])('takes no action for status %p', async (status) => {
    const response = await deliver({ tracking_data: { awb: 'AWB-1', status } });
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(false);
    expect(prisma.orders.findMany).not.toHaveBeenCalled();
  });

  it.each([[null], [{}], [{ tracking_data: {} }], [{ tracking_data: { status: 'shipped' } }], [{ tracking_data: { awb: 42, status: 'shipped' } }]])(
    'rejects the payload %p',
    async (body) => {
      expect((await deliver(body)).status).toBe(400);
      expect(prisma.orders.updateMany).not.toHaveBeenCalled();
    }
  );

  it('returns 500 when the update fails', async () => {
    (prisma.orders.updateMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await deliver(SHIPPED)).status).toBe(500);
  });
});
