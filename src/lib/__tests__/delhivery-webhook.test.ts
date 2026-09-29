jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as delhiveryWebhook } from '@/app/api/webhooks/delhivery/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const fetchMock = global.fetch as jest.Mock;

function deliver(body: unknown) {
  return delhiveryWebhook({ json: async () => body } as unknown as NextRequest);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.orders.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('POST /api/webhooks/delhivery', () => {
  it.each(['Shipped', 'dispatched', 'IN_TRANSIT'])('marks orders with the AWB as shipped for status %p', async (status) => {
    const response = await deliver({ tracking_data: { awb: 'AWB-1', status } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, message: 'Marked 1 order(s) with AWB AWB-1 as shipped' });
    expect(prisma.orders.updateMany).toHaveBeenCalledWith({
      where: { tracking_id: 'AWB-1' },
      data: { delhivery_api_status: 'shipped', updated_at: expect.any(Date) },
    });
  });

  it('never calls Shopify or any other external service', async () => {
    await deliver({ tracking_data: { order_id: '12345', awb: 'AWB-1', tracking_link: 'https://t', status: 'shipped' } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('no longer requires the Shopify order ID or tracking link', async () => {
    expect((await deliver({ tracking_data: { awb: 'AWB-1', status: 'shipped' } })).status).toBe(200);
  });

  it.each([['delivered'], ['RTO'], [undefined], [42]])('takes no action for status %p', async (status) => {
    const response = await deliver({ tracking_data: { awb: 'AWB-1', status } });
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(false);
    expect(prisma.orders.updateMany).not.toHaveBeenCalled();
  });

  it.each([[null], [{}], [{ tracking_data: {} }], [{ tracking_data: { status: 'shipped' } }]])('rejects the payload %p', async (body) => {
    expect((await deliver(body)).status).toBe(400);
    expect(prisma.orders.updateMany).not.toHaveBeenCalled();
  });

  it('returns 500 when the update fails', async () => {
    (prisma.orders.updateMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await deliver({ tracking_data: { awb: 'AWB-1', status: 'shipped' } })).status).toBe(500);
  });
});
