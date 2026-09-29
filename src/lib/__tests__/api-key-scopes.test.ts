jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/api-key-auth', () => ({
  ...jest.requireActual('@/lib/api-key-auth'),
  authenticateApiKey: jest.fn(),
}));
jest.mock('@/lib/credit-service', () => ({
  ...jest.requireActual('@/lib/credit-service'),
  CreditService: {
    getCreditCost: () => 1,
    deductCredits: jest.fn().mockResolvedValue({ balance: 1, transactionId: 'txn' }),
    refundCredits: jest.fn(),
    attachOrderToTransaction: jest.fn().mockResolvedValue(undefined),
  },
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { authenticateApiKey } from '@/lib/api-key-auth';
import { signedRequest } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import * as courierServices from '@/app/api/courier-services/route';
import * as carrierRates from '@/app/api/carrier/rates/route';
import * as externalOrders from '@/app/api/external/orders/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

function withKey(permissions: string[]) {
  (authenticateApiKey as jest.Mock).mockResolvedValue({ id: 'key-1', clientId: 'client-a', permissions, keyPrefix: 'sk_abc', isActive: true });
}

const ORDER = { name: 'A', mobile: '9876543210', address: 'x', city: 'x', state: 'x', pincode: '560001', courier_service: 'dtdc', pickup_location: 'n', package_value: 1, weight: 1, total_items: 1 };

type Case = [string, () => Promise<{ status: number }>, string];

const CASES: Case[] = [
  ['GET /api/courier-services', () => courierServices.GET(signedRequest({}, { url: 'http://localhost/api/courier-services' })), 'courier-services:read'],
  ['POST /api/courier-services', () => courierServices.POST(signedRequest({ name: 'X', code: 'x' })), 'courier-services:write'],
  ['PUT /api/courier-services', () => courierServices.PUT(signedRequest({ id: 'c1', name: 'X' })), 'courier-services:write'],
  ['GET /api/carrier/rates', () => carrierRates.GET(signedRequest({}, { url: 'http://localhost/api/carrier/rates' })), 'orders:read'],
  ['POST /api/carrier/rates', () => carrierRates.POST(signedRequest({ pickupPincode: '560001', deliveryPincode: '110001', weight: 500 })), 'orders:read'],
  ['GET /api/external/orders', () => externalOrders.GET(signedRequest({}, { url: 'http://localhost/api/external/orders' })), 'orders:read'],
  ['POST /api/external/orders', () => externalOrders.POST(signedRequest(ORDER)), 'orders:write'],
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(null);
  (prisma.courier_services.findFirst as jest.Mock).mockResolvedValue({ id: 'c1', clientId: 'client-a' });
  (prisma.courier_services.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 'c2', ...data }));
  (prisma.courier_services.update as jest.Mock).mockImplementation(async ({ data }) => ({ id: 'c1', ...data }));
  (prisma.orders.create as jest.Mock).mockImplementation(async ({ data }) => ({ id: 1, ...data }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(CASES)('%s', (_label, call, scope) => {
  it(`rejects a key without ${scope} and writes nothing`, async () => {
    withKey(['orders:read', 'orders:write', 'courier-services:read', 'courier-services:write'].filter((s) => s !== scope));
    const response = await call();
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('rejects a legacy wildcard key', async () => {
    withKey(['*']);
    expect((await call()).status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it(`accepts a key with ${scope}`, async () => {
    withKey([scope]);
    expect([401, 403]).not.toContain((await call()).status);
  });
});
