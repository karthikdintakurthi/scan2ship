/**
 * @jest-environment node
 *
 * Runs against a real Postgres database, only when S2S_SESSION_DATABASE_URL is
 * set, and only if it points at a database whose name contains "session".
 * It creates throwaway tenants and deletes them afterwards.
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
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { reviewRechargeRequest, submitRechargeRequest } from '@/lib/application/credit-recharge';

const describeWithDatabase = SESSION_DATABASE_URL ? describe : describe.skip;
const RUN = Date.now();
const TENANT_A = `client-recharge-a-${RUN}`;
const TENANT_B = `client-recharge-b-${RUN}`;

function member(id: string, clientId: string, role: UserRole): AuthenticatedUser {
  return {
    id,
    email: `${id}@test.invalid`,
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

const tenantUserA = member(`user-a-${RUN}`, TENANT_A, UserRole.USER);
const tenantUserB = member(`user-b-${RUN}`, TENANT_B, UserRole.USER);
const reviewer = member(`reviewer-${RUN}`, TENANT_A, UserRole.SUPER_ADMIN);

describeWithDatabase(`recharge requests (database ${databaseName || 'none'})`, () => {
  beforeAll(async () => {
    if (!databaseName.includes('session')) {
      throw new Error(`Refusing to run against ${databaseName}: only session databases may be used`);
    }
    for (const id of [TENANT_A, TENANT_B]) {
      await prisma.clients.create({ data: { id, name: id, companyName: id, email: `${id}@test.invalid`, updatedAt: new Date() } });
    }
    for (const u of [tenantUserA, tenantUserB, reviewer]) {
      await prisma.users.create({ data: { id: u.id, email: u.email, name: u.id, role: u.role, clientId: u.clientId, updatedAt: new Date() } });
    }
  });

  beforeEach(async () => {
    await prisma.credit_recharge_requests.deleteMany({ where: { clientId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.credit_transactions.deleteMany({ where: { clientId: { in: [TENANT_A, TENANT_B] } } });
    await prisma.client_credits.deleteMany({ where: { clientId: { in: [TENANT_A, TENANT_B] } } });
  });

  afterAll(async () => {
    await prisma.clients.deleteMany({ where: { id: { in: [TENANT_A, TENANT_B] } } });
    await prisma.$disconnect();
  });

  it('adds credits exactly once when the same request is approved concurrently', async () => {
    const recharge = await submitRechargeRequest(tenantUserA, { transactionRef: `REF-${RUN}-1`, amount: 700, utrNumber: `${RUN}01` });

    const results = await Promise.allSettled(Array.from({ length: 10 }, () => reviewRechargeRequest(reviewer, recharge.id, 'approve')));

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected' && (r.reason as { status?: number }).status === 409)).toHaveLength(9);

    const credits = await prisma.client_credits.findUniqueOrThrow({ where: { clientId: TENANT_A } });
    expect(credits.balance).toBe(700);

    const additions = await prisma.credit_transactions.findMany({ where: { clientId: TENANT_A, type: 'ADD' } });
    expect(additions).toHaveLength(1);
    expect(additions[0]).toMatchObject({ amount: 700, utrNumber: `${RUN}01`, userId: reviewer.id });

    const stored = await prisma.credit_recharge_requests.findUniqueOrThrow({ where: { id: recharge.id } });
    expect(stored).toMatchObject({ status: 'approved', reviewedById: reviewer.id, creditTransactionId: additions[0].id });
  });

  it('rejects a UTR that another tenant already submitted', async () => {
    await submitRechargeRequest(tenantUserA, { transactionRef: `REF-${RUN}-2`, amount: 100, utrNumber: `${RUN}02` });

    await expect(
      submitRechargeRequest(tenantUserB, { transactionRef: `REF-${RUN}-other`, amount: 100, utrNumber: ` ${RUN}02 ` })
    ).rejects.toMatchObject({ status: 409 });
  });

  it('rejects a repeated transaction reference within a tenant but allows it in another tenant', async () => {
    await submitRechargeRequest(tenantUserA, { transactionRef: `REF-${RUN}-3`, amount: 100 });

    await expect(submitRechargeRequest(tenantUserA, { transactionRef: `REF-${RUN}-3`, amount: 100 })).rejects.toMatchObject({ status: 409 });
    await expect(submitRechargeRequest(tenantUserB, { transactionRef: `REF-${RUN}-3`, amount: 100 })).resolves.toMatchObject({ status: 'pending' });
  });

  it('never adds credits for a rejected request, even if approval is attempted later', async () => {
    const recharge = await submitRechargeRequest(tenantUserA, { transactionRef: `REF-${RUN}-4`, amount: 250 });

    await reviewRechargeRequest(reviewer, recharge.id, 'reject', 'UTR not found in statement');
    await expect(reviewRechargeRequest(reviewer, recharge.id, 'approve')).rejects.toMatchObject({ status: 409 });

    expect(await prisma.client_credits.findUnique({ where: { clientId: TENANT_A } })).toBeNull();
    expect(await prisma.credit_recharge_requests.findUniqueOrThrow({ where: { id: recharge.id } })).toMatchObject({
      status: 'rejected',
      reviewNote: 'UTR not found in statement',
    });
  });
});
