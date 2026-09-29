jest.unmock('jsonwebtoken');
jest.unmock('path');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/client-credit-costs-service', () => ({ ClientCreditCostsService: {} }));

import fs from 'node:fs';
import { Prisma } from '@prisma/client';
import { prisma as realPrisma } from '@/lib/prisma';
import { applySecurityMiddleware } from '@/lib/security-middleware';
import { CreditService } from '@/lib/credit-service';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import {
  MAX_RECHARGE_AMOUNT,
  normalizeUtr,
  RechargeRequestError,
  reviewRechargeRequest,
  submitRechargeRequest,
} from '@/lib/application/credit-recharge';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as verifyPayment } from '@/app/api/credits/verify-payment/route';
import { GET as listOwnRecharges } from '@/app/api/credits/recharge-requests/route';
import { GET as listAllRecharges } from '@/app/api/admin/credits/recharge-requests/route';
import { POST as reviewRecharge } from '@/app/api/admin/credits/recharge-requests/[id]/route';

const { join } = jest.requireActual('path');
const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const recharges = prisma.credit_recharge_requests;

function user(role: UserRole, clientId = 'client-a'): AuthenticatedUser {
  return {
    id: TEST_USER_ID,
    email: `${role}@test`,
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

function actAs(role: string, clientId = 'client-a') {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role, clientId));
}

const PAYMENT = { transactionRef: 'S2S-123', amount: 500, utrNumber: ' 1234 5678 9012 ', paymentDetails: { payeeVpa: 'pay@upi' } };
const duplicateError = () => new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  (recharges.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, createdAt: new Date() }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('normalizeUtr', () => {
  it.each([
    [' 1234 5678 9012 ', '123456789012'],
    ['abc123', 'ABC123'],
    ['   ', null],
    [undefined, null],
    [42, null],
  ])('normalizes %p to %p', (input, expected) => {
    expect(normalizeUtr(input)).toBe(expected);
  });
});

describe('submitRechargeRequest', () => {
  it('stores a pending request for the caller tenant without adding credits', async () => {
    const request = await submitRechargeRequest(user(UserRole.USER), PAYMENT);

    expect(recharges.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: 'client-a',
        requestedById: TEST_USER_ID,
        amount: 500,
        transactionRef: 'S2S-123',
        utrNumber: '123456789012',
        paymentDetails: { payeeVpa: 'pay@upi' },
        status: 'pending',
      }),
    });
    expect(request.status).toBe('pending');
    expect(prisma.client_credits.upsert).not.toHaveBeenCalled();
    expect(prisma.credit_transactions.create).not.toHaveBeenCalled();
  });

  it.each([0, -5, 1.5, 'abc', MAX_RECHARGE_AMOUNT + 1, undefined])('rejects the amount %p', async (amount) => {
    await expect(submitRechargeRequest(user(UserRole.USER), { ...PAYMENT, amount })).rejects.toMatchObject({ status: 400 });
    expect(recharges.create).not.toHaveBeenCalled();
  });

  it('accepts a numeric string amount', async () => {
    await submitRechargeRequest(user(UserRole.USER), { ...PAYMENT, amount: '250' });
    expect((recharges.create as jest.Mock).mock.calls[0][0].data.amount).toBe(250);
  });

  it.each(['', '   ', 'x'.repeat(101), 42, undefined])('rejects the transaction reference %p', async (transactionRef) => {
    await expect(submitRechargeRequest(user(UserRole.USER), { ...PAYMENT, transactionRef })).rejects.toMatchObject({ status: 400 });
  });

  it('ignores non-object payment details', async () => {
    await submitRechargeRequest(user(UserRole.USER), { ...PAYMENT, paymentDetails: ['x'] });
    expect((recharges.create as jest.Mock).mock.calls[0][0].data.paymentDetails).toBeUndefined();
  });

  it('turns a duplicate UTR or reference into a 409', async () => {
    (recharges.create as jest.Mock).mockRejectedValue(duplicateError());
    await expect(submitRechargeRequest(user(UserRole.USER), PAYMENT)).rejects.toMatchObject({ status: 409, message: 'This payment has already been submitted' });
  });

  it('rethrows other database errors', async () => {
    (recharges.create as jest.Mock).mockRejectedValue(new Error('db down'));
    await expect(submitRechargeRequest(user(UserRole.USER), PAYMENT)).rejects.toThrow('db down');
  });
});

describe('listRechargeRequests', () => {
  it('lists every request, newest first, when called without filters', async () => {
    const { listRechargeRequests } = jest.requireActual('@/lib/application/credit-recharge');
    await listRechargeRequests();
    expect((recharges.findMany as jest.Mock).mock.calls[0][0]).toMatchObject({ where: {}, orderBy: { createdAt: 'desc' }, take: 200 });
  });
});

describe('reviewRechargeRequest', () => {
  const pending = { id: 'r1', clientId: 'client-b', amount: 500, transactionRef: 'S2S-123', utrNumber: '123456789012', clients: { companyName: 'Tenant B' } };
  let addInTx: jest.SpyInstance;

  beforeEach(() => {
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (recharges.findUniqueOrThrow as jest.Mock).mockResolvedValue(pending);
    (recharges.update as jest.Mock).mockImplementation(async ({ data }) => ({ ...pending, status: 'approved', ...data }));
    addInTx = jest.spyOn(CreditService, 'addCreditsInTransaction').mockResolvedValue({ credits: { balance: 1500 } as never, transactionId: 'txn-add' });
  });

  it('claims the request only while it is pending, then adds the credits in the same transaction', async () => {
    const result = await reviewRechargeRequest(user(UserRole.SUPER_ADMIN, 'platform'), 'r1', 'approve');

    expect(recharges.updateMany).toHaveBeenCalledWith({
      where: { id: 'r1', status: 'pending' },
      data: expect.objectContaining({ status: 'approved', reviewedById: TEST_USER_ID, reviewNote: null }),
    });
    expect(addInTx).toHaveBeenCalledWith(expect.anything(), 'client-b', 500, expect.stringContaining('UTR: 123456789012'), {
      userId: TEST_USER_ID,
      clientName: 'Tenant B',
      utrNumber: '123456789012',
    });
    expect(recharges.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { creditTransactionId: 'txn-add' } });
    expect(result.credits?.balance).toBe(1500);
  });

  it('omits the UTR from the ledger description when there is none', async () => {
    (recharges.findUniqueOrThrow as jest.Mock).mockResolvedValue({ ...pending, utrNumber: null });
    await reviewRechargeRequest(user(UserRole.SUPER_ADMIN, 'platform'), 'r1', 'approve');
    expect(addInTx.mock.calls[0][3]).not.toContain('UTR');
  });

  it('rejects without adding credits and stores a trimmed note', async () => {
    const result = await reviewRechargeRequest(user(UserRole.SUPER_ADMIN, 'platform'), 'r1', 'reject', '  UTR not in statement  ');

    expect((recharges.updateMany as jest.Mock).mock.calls[0][0].data).toMatchObject({ status: 'rejected', reviewNote: 'UTR not in statement' });
    expect(addInTx).not.toHaveBeenCalled();
    expect(result.credits).toBeNull();
  });

  it('reports 409 when the request was already reviewed', async () => {
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (recharges.findUnique as jest.Mock).mockResolvedValue({ status: 'approved' });

    await expect(reviewRechargeRequest(user(UserRole.SUPER_ADMIN, 'platform'), 'r1', 'approve')).rejects.toMatchObject({
      status: 409,
      message: 'This request was already approved',
    });
    expect(addInTx).not.toHaveBeenCalled();
  });

  it('reports 404 for an unknown request', async () => {
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (recharges.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(reviewRechargeRequest(user(UserRole.SUPER_ADMIN, 'platform'), 'nope', 'approve')).rejects.toMatchObject({ status: 404 });
  });
});

describe('POST /api/credits/verify-payment', () => {
  it('records a pending request and adds no credits', async () => {
    actAs('user');
    const addCredits = jest.spyOn(CreditService, 'addCredits');

    const response = await verifyPayment(signedRequest(PAYMENT));
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({ success: true, status: 'pending', amount: 500 });
    expect(addCredits).not.toHaveBeenCalled();
    expect(prisma.client_credits.upsert).not.toHaveBeenCalled();
    expect(prisma.client_credits.update).not.toHaveBeenCalled();
  });

  it('is not available to child users, who cannot access the wallet', async () => {
    actAs('child_user');
    const response = await verifyPayment(signedRequest(PAYMENT));
    expect(response.status).toBe(403);
    expect(recharges.create).not.toHaveBeenCalled();
  });

  it('returns 409 for a payment that was already submitted', async () => {
    actAs('user');
    (recharges.create as jest.Mock).mockRejectedValue(duplicateError());
    const response = await verifyPayment(signedRequest(PAYMENT));
    expect(response.status).toBe(409);
  });

  it('returns 400 for an invalid amount', async () => {
    actAs('user');
    const response = await verifyPayment(signedRequest({ ...PAYMENT, amount: -1 }));
    expect(response.status).toBe(400);
  });

  it('accepts multipart form submissions', async () => {
    actAs('user');
    const form = new Map<string, string>([
      ['transactionRef', 'S2S-FORM'],
      ['amount', '300'],
      ['utrNumber', '999988887777'],
      ['paymentDetails', JSON.stringify({ payeeVpa: 'pay@upi' })],
    ]);
    const request = Object.assign(signedRequest(), {
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'multipart/form-data; boundary=x' : signedRequest().headers.get(name)) },
      formData: async () => ({ get: (key: string) => form.get(key) ?? null }),
    });

    const response = await verifyPayment(request);

    expect(response.status).toBe(202);
    expect((recharges.create as jest.Mock).mock.calls[0][0].data).toMatchObject({ transactionRef: 'S2S-FORM', amount: 300, paymentDetails: { payeeVpa: 'pay@upi' } });
  });

  it('accepts multipart submissions without payment details', async () => {
    actAs('user');
    const form = new Map<string, string>([['transactionRef', 'S2S-FORM2'], ['amount', '300']]);
    const request = Object.assign(signedRequest(), {
      headers: { get: (name: string) => (name.toLowerCase() === 'content-type' ? 'multipart/form-data' : signedRequest().headers.get(name)) },
      formData: async () => ({ get: (key: string) => form.get(key) ?? null }),
    });

    expect((await verifyPayment(request)).status).toBe(202);
  });

  it('treats a null JSON body as an empty submission', async () => {
    actAs('user');
    expect((await verifyPayment(signedRequest(null))).status).toBe(400);
  });

  it('returns the security middleware response first', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });
    expect((await verifyPayment(signedRequest(PAYMENT))).status).toBe(429);
  });

  it('returns 500 for unexpected errors', async () => {
    actAs('user');
    (recharges.create as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await verifyPayment(signedRequest(PAYMENT))).status).toBe(500);
  });
});

describe('GET /api/credits/recharge-requests', () => {
  it("lists only the caller tenant's requests, without internal fields", async () => {
    actAs('user');
    (recharges.findMany as jest.Mock).mockResolvedValue([
      { id: 'r1', clientId: 'client-a', amount: 500, transactionRef: 'S2S-1', utrNumber: 'U1', status: 'pending', reviewNote: null, createdAt: new Date(), reviewedAt: null, creditTransactionId: 'txn', paymentDetails: { payeeVpa: 'x' } },
    ]);

    const response = await listOwnRecharges(signedRequest());
    const body = await response.json();

    expect((recharges.findMany as jest.Mock).mock.calls[0][0].where).toEqual({ clientId: 'client-a' });
    expect(body.data[0]).toEqual(expect.objectContaining({ id: 'r1', status: 'pending' }));
    expect(body.data[0]).not.toHaveProperty('creditTransactionId');
    expect(body.data[0]).not.toHaveProperty('paymentDetails');
  });

  it('is not available to child users', async () => {
    actAs('child_user');
    expect((await listOwnRecharges(signedRequest())).status).toBe(403);
  });

  it('returns the security middleware response first', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });
    expect((await listOwnRecharges(signedRequest())).status).toBe(429);
  });

  it('returns 500 when the lookup fails', async () => {
    actAs('user');
    (recharges.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await listOwnRecharges(signedRequest())).status).toBe(500);
  });
});

describe('GET /api/admin/credits/recharge-requests', () => {
  const url = (status?: string) => `http://localhost/api/admin/credits/recharge-requests${status ? `?status=${status}` : ''}`;

  it.each(['child_user', 'user', 'client_admin'])('returns 403 to %s', async (role) => {
    actAs(role);
    expect((await listAllRecharges(signedRequest({}, { url: url('pending') }))).status).toBe(403);
  });

  it('lists requests across tenants filtered by status', async () => {
    actAs('super_admin', 'platform');
    (recharges.findMany as jest.Mock).mockResolvedValue([]);
    const response = await listAllRecharges(signedRequest({}, { url: url('pending') }));
    expect(response.status).toBe(200);
    expect((recharges.findMany as jest.Mock).mock.calls[0][0].where).toEqual({ status: 'pending' });
  });

  it('lists every request when no status is given', async () => {
    actAs('super_admin', 'platform');
    await listAllRecharges(signedRequest({}, { url: url() }));
    expect((recharges.findMany as jest.Mock).mock.calls[0][0].where).toEqual({});
  });

  it('rejects an unknown status', async () => {
    actAs('super_admin', 'platform');
    expect((await listAllRecharges(signedRequest({}, { url: url('paid') }))).status).toBe(400);
  });

  it('returns the security middleware response first', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });
    expect((await listAllRecharges(signedRequest({}, { url: url() }))).status).toBe(429);
  });

  it('returns 500 when the lookup fails', async () => {
    actAs('super_admin', 'platform');
    (recharges.findMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await listAllRecharges(signedRequest({}, { url: url() }))).status).toBe(500);
  });
});

describe('POST /api/admin/credits/recharge-requests/[id]', () => {
  const params = { params: Promise.resolve({ id: 'r1' }) };

  it.each(['child_user', 'user', 'client_admin'])('returns 403 to %s and changes nothing', async (role) => {
    actAs(role);
    const response = await reviewRecharge(signedRequest({ action: 'approve' }), params);
    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each([[{}], [{ action: 'approve-all' }], [null]])('rejects the body %p', async (body) => {
    actAs('super_admin', 'platform');
    expect((await reviewRecharge(signedRequest(body), params)).status).toBe(400);
  });

  it('approves and returns the new balance', async () => {
    actAs('super_admin', 'platform');
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (recharges.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'r1', clientId: 'client-b', amount: 500, transactionRef: 'S2S', utrNumber: null, clients: { companyName: 'B' } });
    (recharges.update as jest.Mock).mockResolvedValue({ id: 'r1', status: 'approved' });
    jest.spyOn(CreditService, 'addCreditsInTransaction').mockResolvedValue({ credits: { balance: 900 } as never, transactionId: 'txn' });

    const response = await reviewRecharge(signedRequest({ action: 'approve' }), params);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.newBalance).toBe(900);
  });

  it('returns null newBalance on rejection', async () => {
    actAs('super_admin', 'platform');
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (recharges.findUniqueOrThrow as jest.Mock).mockResolvedValue({ id: 'r1', status: 'rejected', clients: { companyName: 'B' } });

    const body = await (await reviewRecharge(signedRequest({ action: 'reject', note: 'no' }), params)).json();
    expect(body.newBalance).toBeNull();
  });

  it('passes review conflicts through with their status', async () => {
    actAs('super_admin', 'platform');
    (recharges.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    (recharges.findUnique as jest.Mock).mockResolvedValue({ status: 'rejected' });
    expect((await reviewRecharge(signedRequest({ action: 'approve' }), params)).status).toBe(409);
  });

  it('returns the security middleware response first', async () => {
    (applySecurityMiddleware as jest.Mock).mockResolvedValueOnce({ status: 429 });
    expect((await reviewRecharge(signedRequest({ action: 'approve' }), params)).status).toBe(429);
  });

  it('returns 500 for unexpected errors', async () => {
    actAs('super_admin', 'platform');
    (recharges.updateMany as jest.Mock).mockRejectedValue(new Error('db down'));
    expect((await reviewRecharge(signedRequest({ action: 'approve' }), params)).status).toBe(500);
  });
});

describe('recharge pages', () => {
  const read = (file: string) => fs.readFileSync(join(__dirname, '..', '..', file), 'utf8');

  it('the credits page says the payment awaits verification instead of claiming credits were added', () => {
    const page = read('app/credits/page.tsx');
    expect(page).not.toContain('Credits recharged successfully!');
    expect(page).toContain('Credits will be added after an administrator verifies it.');
    expect(page).toContain("'/api/credits/recharge-requests'");
  });

  it('the admin credits page reviews pending requests through the review endpoint', () => {
    const page = read('app/admin/credits/page.tsx');
    expect(page).toContain("'/api/admin/credits/recharge-requests?status=pending'");
    expect(page).toContain('`/api/admin/credits/recharge-requests/${rechargeId}`');
  });
});

it('RechargeRequestError keeps its HTTP status', () => {
  const error = new RechargeRequestError('nope', 404);
  expect(error).toMatchObject({ status: 404, name: 'RechargeRequestError', message: 'nope' });
});
