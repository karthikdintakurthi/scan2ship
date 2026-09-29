jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { maskMobile, maskName, normalizeIndianMobile } from '@/lib/application/public-tracking';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as trackByPhone } from '@/app/api/tracking/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

function lookup(body: unknown) {
  return trackByPhone({ json: async () => body, headers: { get: () => null } } as unknown as NextRequest);
}

const ROWS = [
  { id: 11, clientId: 'client-a-internal-id', name: 'Asha Kumari', courier_service: 'delhivery', tracking_id: 'AWB-1', tracking_status: 'in_transit', created_at: new Date('2026-09-20'), client_name: 'A', client_company_name: 'Acme Jewels', search_type: 'customer' },
  { id: 12, clientId: 'client-a-internal-id', name: 'Asha Kumari', courier_service: 'dtdc', tracking_id: null, tracking_status: 'pending', created_at: new Date('2026-09-19'), client_name: 'A', client_company_name: 'Acme Jewels', search_type: 'reseller' },
  { id: 13, clientId: 'client-b-internal-id', name: '', courier_service: 'india_post', tracking_id: 'EE1', tracking_status: null, created_at: new Date('2026-09-18'), client_name: 'Bee Store', client_company_name: null, search_type: 'customer' },
  { id: 14, clientId: 'client-c-internal-id', name: 'R', courier_service: 'manual', tracking_id: null, tracking_status: null, created_at: new Date('2026-09-17'), client_name: null, client_company_name: null, search_type: 'customer' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('public tracking helpers', () => {
  it.each([
    ['9876543210', '9876543210'],
    ['+91 98765 43210', '9876543210'],
    ['919876543210', '9876543210'],
    ['9109876543210', '9876543210'],
    ['5876543210', null],
    ['98765', null],
    ['', null],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each([
    ['Asha Kumari', 'A*** K***'],
    ['  Ravi  ', 'R***'],
    ['', '***'],
    [null, '***'],
    [undefined, '***'],
  ])('masks the name %p as %p', (input, expected) => {
    expect(maskName(input)).toBe(expected);
  });

  it('masks all but the last four digits of a phone number', () => {
    expect(maskMobile('9876543210')).toBe('******3210');
    expect(maskMobile('123')).toBe('123');
  });
});

describe('POST /api/tracking', () => {
  it('uses the IP-keyed tracking rate limit and returns its response when limited', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });

    const response = await lookup({ mobile: '9876543210' });

    expect((applySecurityMiddleware as jest.Mock).mock.calls[0][2]).toMatchObject({ rateLimit: 'tracking' });
    expect(response.status).toBe(429);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it.each([[{}], [{ mobile: 9876543210 }], [{ mobile: '12345' }], [null]])('rejects %p without querying', async (body) => {
    const response = await lookup(body);
    expect(response.status).toBe(400);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('returns only masked, minimal fields grouped under opaque seller keys', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue(ROWS);

    const response = await lookup({ mobile: '+91 98765 43210' });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.mobile).toBe('******3210');
    expect(body.data.totalOrders).toBe(4);
    expect(body.data.ordersByClient).toEqual([
      {
        clientId: 'seller-1',
        clientName: 'Acme Jewels',
        orders: [
          { id: 11, name: 'A*** K***', search_type: 'customer', tracking_id: 'AWB-1', tracking_status: 'in_transit', courier_service: 'delhivery', created_at: ROWS[0].created_at },
          { id: 12, name: 'A*** K***', search_type: 'reseller', tracking_id: null, tracking_status: 'pending', courier_service: 'dtdc', created_at: ROWS[1].created_at },
        ],
      },
      { clientId: 'seller-2', clientName: 'Bee Store', orders: [expect.objectContaining({ id: 13, name: '***' })] },
      { clientId: 'seller-3', clientName: 'Seller', orders: [expect.objectContaining({ id: 14, name: 'R***' })] },
    ]);

    const text = JSON.stringify(body);
    expect(text).not.toContain('internal-id');
    expect(text).not.toContain('Kumari');
    expect(text).not.toContain('9876543210');
  });

  it('queries by the normalized number with a result cap and no address or value columns', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);

    await lookup({ mobile: '9876543210' });

    const [strings, ...values] = (prisma.$queryRaw as jest.Mock).mock.calls[0];
    const sql = strings.join('?');
    expect(values).toEqual(['9876543210', '9876543210', '9876543210', 50]);
    expect(sql).toMatch(/LIMIT \?/);
    for (const column of ['address', 'pincode', 'package_value', 'cod_amount', 'reseller_mobile,', 'o.mobile,', 'reference_number']) {
      expect(sql).not.toContain(column);
    }
  });

  it('does not log the phone number', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    await lookup({ mobile: '9876543210' });
    const logged = (console.log as jest.Mock).mock.calls.flat().map(String).join(' ');
    expect(logged).toContain('******3210');
    expect(logged).not.toContain('9876543210');
  });

  it('returns 500 when the lookup fails', async () => {
    (prisma.$queryRaw as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await lookup({ mobile: '9876543210' })).status).toBe(500);
  });
});
