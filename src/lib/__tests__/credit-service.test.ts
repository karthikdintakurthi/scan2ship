/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/client-credit-costs-service', () => ({ ClientCreditCostsService: { getClientCreditCost: jest.fn() } }));

import { prisma as realPrisma } from '@/lib/prisma';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';
import type { createPrismaMock } from '@/test-utils/prisma-mock';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const credits = prisma.client_credits;
const ledger = prisma.credit_transactions;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CreditService.deductCredits', () => {
  it('checks and decrements the balance in one conditional update', async () => {
    (credits.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (credits.findUniqueOrThrow as jest.Mock).mockResolvedValue({ clientId: 'client-a', balance: 9 });

    const charge = await CreditService.deductCredits('client-a', 1, 'Order creation', 'ORDER', 'user-1');

    expect(credits.updateMany).toHaveBeenCalledWith({
      where: { clientId: 'client-a', balance: { gte: 1 } },
      data: expect.objectContaining({ balance: { decrement: 1 }, totalUsed: { increment: 1 } }),
    });
    expect(credits.update).not.toHaveBeenCalled();
    expect(charge).toMatchObject({ balance: 9, transactionId: expect.stringMatching(/^txn-/) });
  });

  it('records the post-update balance and returns the ledger transaction ID', async () => {
    (credits.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (credits.findUniqueOrThrow as jest.Mock).mockResolvedValue({ clientId: 'client-a', balance: 41 });

    const charge = await CreditService.deductCredits('client-a', 2, 'AI', 'IMAGE_PROCESSING', 'user-1', 7);

    const entry = (ledger.create as jest.Mock).mock.calls[0][0].data;
    expect(entry).toMatchObject({ type: 'DEDUCT', amount: 2, balance: 41, feature: 'IMAGE_PROCESSING', orderId: 7, userId: 'user-1' });
    expect(entry.id).toBe(charge.transactionId);
  });

  it('throws InsufficientCreditsError and writes no ledger entry when the balance is too low', async () => {
    (credits.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await expect(CreditService.deductCredits('client-a', 5, 'Order creation', 'ORDER')).rejects.toBeInstanceOf(InsufficientCreditsError);
    expect(ledger.create).not.toHaveBeenCalled();
  });

  it('wraps other failures in a generic error', async () => {
    (credits.updateMany as jest.Mock).mockRejectedValue(new Error('connection reset'));
    await expect(CreditService.deductCredits('client-a', 1, 'x', 'ORDER')).rejects.toThrow('Failed to deduct credits');
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects the amount %p without touching the database', async (amount) => {
    await expect(CreditService.deductCredits('client-a', amount, 'x', 'ORDER')).rejects.toThrow(/positive integer/);
    expect(credits.updateMany).not.toHaveBeenCalled();
  });
});

describe('CreditService.addCredits', () => {
  it('increments atomically, creating the balance row if needed', async () => {
    (credits.upsert as jest.Mock).mockResolvedValue({ clientId: 'client-a', balance: 150 });

    const result = await CreditService.addCredits('client-a', 100, 'Recharge', 'admin-1', 'Tenant A');

    expect(credits.upsert).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      create: expect.objectContaining({ clientId: 'client-a', balance: 100, totalAdded: 100, totalUsed: 0 }),
      update: expect.objectContaining({ balance: { increment: 100 }, totalAdded: { increment: 100 } }),
    });
    expect(credits.findUnique).not.toHaveBeenCalled();
    expect((ledger.create as jest.Mock).mock.calls[0][0].data).toMatchObject({ type: 'ADD', amount: 100, balance: 150, clientName: 'Tenant A' });
    expect(result.balance).toBe(150);
  });

  it('defaults the ledger client name', async () => {
    (credits.upsert as jest.Mock).mockResolvedValue({ clientId: 'client-a', balance: 1 });
    await CreditService.addCredits('client-a', 1, 'Recharge');
    expect((ledger.create as jest.Mock).mock.calls[0][0].data.clientName).toBe('Unknown Client');
  });

  it('rejects a non-positive amount', async () => {
    await expect(CreditService.addCredits('client-a', 0, 'x')).rejects.toThrow(/positive integer/);
    expect(credits.upsert).not.toHaveBeenCalled();
  });

  it('wraps database failures', async () => {
    (credits.upsert as jest.Mock).mockRejectedValue(new Error('db down'));
    await expect(CreditService.addCredits('client-a', 1, 'x')).rejects.toThrow('Failed to add credits');
  });
});

describe('CreditService.refundCredits', () => {
  it('returns the credits, reverses the usage count, and records a REFUND entry', async () => {
    (credits.update as jest.Mock).mockResolvedValue({ clientId: 'client-a', balance: 10 });

    await CreditService.refundCredits('client-a', 1, 'Refund: Delhivery booking failed', 'ORDER', 'user-1');

    expect(credits.update).toHaveBeenCalledWith({
      where: { clientId: 'client-a' },
      data: expect.objectContaining({ balance: { increment: 1 }, totalUsed: { decrement: 1 } }),
    });
    expect((ledger.create as jest.Mock).mock.calls[0][0].data).toMatchObject({ type: 'REFUND', amount: 1, balance: 10, feature: 'ORDER' });
  });

  it('rejects a non-positive amount', async () => {
    await expect(CreditService.refundCredits('client-a', -1, 'x', 'ORDER')).rejects.toThrow(/positive integer/);
  });
});

describe('CreditService.attachOrderToTransaction', () => {
  it('links the ledger entry to the order', async () => {
    await CreditService.attachOrderToTransaction('txn-1', 42);
    expect(ledger.update).toHaveBeenCalledWith({ where: { id: 'txn-1' }, data: { orderId: 42 } });
  });
});

describe('InsufficientCreditsError', () => {
  it('carries the required amount and a stable message', () => {
    const error = new InsufficientCreditsError(3);
    expect(error.message).toBe('Insufficient credits');
    expect(error.required).toBe(3);
    expect(error.name).toBe('InsufficientCreditsError');
  });
});
