/**
 * @jest-environment node
 *
 * Runs the public tracking route, its SQL, and the persistent rate limiter
 * against a real Postgres database, only when S2S_SESSION_DATABASE_URL is set
 * and names a session database. Test rows are removed afterwards.
 */
jest.unmock('path');
jest.unmock('fs/promises');

const SESSION_DATABASE_URL = process.env.S2S_SESSION_DATABASE_URL;
const databaseName = SESSION_DATABASE_URL ? new URL(SESSION_DATABASE_URL).pathname.slice(1) : '';

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => {
  const url = process.env.S2S_SESSION_DATABASE_URL;
  if (!url) return { prisma: {} };
  const { PrismaClient } = jest.requireActual('@prisma/client');
  return { prisma: new PrismaClient({ datasources: { db: { url } } }) };
});

import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { POST as trackByPhone } from '@/app/api/tracking/route';
import { rateLimit } from '@/lib/persistent-rate-limiter';

const describeWithDatabase = SESSION_DATABASE_URL ? describe : describe.skip;
const RUN = Date.now();
const TENANT = `client-tracking-${RUN}`;
const PHONE = `9${String(RUN).slice(-9)}`;
const TEST_IP = `198.51.100.${RUN % 250}`;

function lookup(ip: string, mobile = PHONE) {
  const headers: Record<string, string> = { 'x-real-ip': ip, origin: 'http://localhost:3000' };
  return trackByPhone({ json: async () => ({ mobile }), headers: { get: (name: string) => headers[name.toLowerCase()] ?? null }, method: 'POST', nextUrl: new URL('http://localhost/api/tracking') } as unknown as NextRequest);
}

function limiterRequest(ip: string) {
  return { headers: { get: (name: string) => (name.toLowerCase() === 'x-real-ip' ? ip : null) } } as unknown as NextRequest;
}

describeWithDatabase(`public tracking (database ${databaseName || 'none'})`, () => {
  beforeAll(async () => {
    if (!databaseName.includes('session')) {
      throw new Error(`Refusing to run against ${databaseName}: only session databases may be used`);
    }
    jest.spyOn(console, 'log').mockImplementation(() => {});
    await prisma.clients.create({ data: { id: TENANT, name: 'Tracking test', companyName: 'Tracking Test Co', email: `${TENANT}@test.invalid`, updatedAt: new Date() } });
    for (const [index, mobile] of [[1, PHONE], [2, PHONE]] as const) {
      await prisma.orders.create({
        data: {
          clientId: TENANT,
          name: 'Asha Kumari',
          mobile,
          address: '12 Secret Street',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'India',
          pincode: '560001',
          courier_service: 'delhivery',
          pickup_location: 'north',
          package_value: 4999,
          weight: 250,
          total_items: 1,
          tracking_id: `AWB-${RUN}-${index}`,
          reference_number: `REF-${PHONE}`,
          is_cod: true,
          cod_amount: 4999,
          updated_at: new Date(),
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.rate_limits.deleteMany({ where: { key: { startsWith: `tracking:ip:${TEST_IP}` } } });
    await prisma.clients.deleteMany({ where: { id: TENANT } });
    await prisma.$disconnect();
    jest.restoreAllMocks();
  });

  it('returns masked, minimal data from real rows', async () => {
    const response = await lookup(TEST_IP);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totalOrders).toBe(2);
    const [group] = body.data.ordersByClient;
    expect(group).toMatchObject({ clientId: 'seller-1', clientName: 'Tracking Test Co' });
    expect(group.orders.map((o: { name: string }) => o.name)).toEqual(['A*** K***', 'A*** K***']);

    const text = JSON.stringify(body);
    for (const secret of ['Secret Street', '560001', '4999', PHONE, TENANT, `REF-${PHONE}`]) {
      expect(text).not.toContain(secret);
    }
  });

  it('the tracking limiter allows 10 lookups per IP per window and blocks the 11th', async () => {
    const ip = `${TEST_IP}-sequential`;
    const results = [];
    for (let i = 0; i < 11; i++) {
      results.push((await rateLimit(limiterRequest(ip), 'tracking')).allowed);
    }
    expect(results).toEqual([...Array(10).fill(true), false]);
  });

  it('allows exactly 10 of 20 concurrent lookups from one IP', async () => {
    const ip = `${TEST_IP}-concurrent`;
    const results = await Promise.all(Array.from({ length: 20 }, () => rateLimit(limiterRequest(ip), 'tracking')));
    expect(results.filter((r) => r.allowed)).toHaveLength(10);
  });

  it('returns 429 from the route once the limit is reached in production', async () => {
    const previousEnv = process.env.NODE_ENV;
    (process.env as Record<string, string>).NODE_ENV = 'production';
    try {
      const ip = `${TEST_IP}-route`;
      const statuses: number[] = [];
      for (let i = 0; i < 11; i++) {
        statuses.push((await lookup(ip)).status);
      }
      expect(statuses).toEqual([...Array(10).fill(200), 429]);
    } finally {
      (process.env as Record<string, string>).NODE_ENV = previousEnv as string;
    }
  });
});
