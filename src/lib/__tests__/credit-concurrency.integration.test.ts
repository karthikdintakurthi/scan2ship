/**
 * @jest-environment node
 *
 * Runs against a real Postgres database, only when S2S_SESSION_DATABASE_URL is
 * set, and only if it points at a database whose name contains "session".
 * It creates a throwaway tenant and deletes it afterwards.
 */
jest.unmock('path');
jest.unmock('fs/promises');

const SESSION_DATABASE_URL = process.env.S2S_SESSION_DATABASE_URL;
const databaseName = SESSION_DATABASE_URL ? new URL(SESSION_DATABASE_URL).pathname.slice(1) : '';

jest.mock('@/lib/prisma', () => {
  const url = process.env.S2S_SESSION_DATABASE_URL;
  if (!url) return { prisma: {} };
  const { PrismaClient } = jest.requireActual('@prisma/client');
  return { prisma: new PrismaClient({ datasources: { db: { url } } }) };
});
jest.mock('@/lib/client-credit-costs-service', () => ({ ClientCreditCostsService: {} }));

import { prisma } from '@/lib/prisma';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';

const describeWithDatabase = SESSION_DATABASE_URL ? describe : describe.skip;
const TENANT = `client-credit-concurrency-${Date.now()}`;

describeWithDatabase(`credit balance under concurrency (database ${databaseName || 'none'})`, () => {
  beforeAll(async () => {
    if (!databaseName.includes('session')) {
      throw new Error(`Refusing to run against ${databaseName}: only session databases may be used`);
    }
    await prisma.clients.create({
      data: { id: TENANT, name: 'Concurrency test', companyName: 'Concurrency test', email: `${TENANT}@test.invalid`, updatedAt: new Date() },
    });
  });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    await prisma.credit_transactions.deleteMany({ where: { clientId: TENANT } });
    await prisma.client_credits.deleteMany({ where: { clientId: TENANT } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await prisma.clients.deleteMany({ where: { id: TENANT } });
    await prisma.$disconnect();
  });

  async function balanceRow() {
    return prisma.client_credits.findUniqueOrThrow({ where: { clientId: TENANT } });
  }

  it('never spends more than the balance when many deductions race', async () => {
    await CreditService.addCredits(TENANT, 5, 'seed');

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => CreditService.deductCredits(TENANT, 1, 'race', 'ORDER'))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const insufficient = results.filter((r) => r.status === 'rejected' && r.reason instanceof InsufficientCreditsError);
    expect(succeeded).toHaveLength(5);
    expect(insufficient).toHaveLength(15);

    const row = await balanceRow();
    expect(row.balance).toBe(0);
    expect(row.totalUsed).toBe(5);

    const deductions = await prisma.credit_transactions.findMany({ where: { clientId: TENANT, type: 'DEDUCT' }, orderBy: { balance: 'desc' } });
    expect(deductions.map((d) => d.balance)).toEqual([4, 3, 2, 1, 0]);
  });

  it('never loses an addition when many additions race', async () => {
    await Promise.all(Array.from({ length: 20 }, () => CreditService.addCredits(TENANT, 1, 'race')));

    const row = await balanceRow();
    expect(row.balance).toBe(20);
    expect(row.totalAdded).toBe(20);
    expect(await prisma.credit_transactions.count({ where: { clientId: TENANT, type: 'ADD' } })).toBe(20);
  });

  it('a refund restores the balance and the usage count', async () => {
    await CreditService.addCredits(TENANT, 3, 'seed');
    await CreditService.deductCredits(TENANT, 1, 'order', 'ORDER');
    await CreditService.refundCredits(TENANT, 1, 'Refund: test', 'ORDER');

    const row = await balanceRow();
    expect(row).toMatchObject({ balance: 3, totalUsed: 0, totalAdded: 3 });
  });
});
