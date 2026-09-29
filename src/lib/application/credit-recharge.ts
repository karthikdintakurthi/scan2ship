import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import type { AuthenticatedUser } from '@/lib/auth-middleware';

export const MAX_RECHARGE_AMOUNT = 100000;
export const RECHARGE_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type RechargeStatus = (typeof RECHARGE_STATUSES)[number];

export class RechargeRequestError extends Error {
  constructor(message: string, public readonly status: 400 | 404 | 409) {
    super(message);
    this.name = 'RechargeRequestError';
  }
}

/** UPI UTRs are 12 digits but are typed with spaces or lowercase letters for other rails. */
export function normalizeUtr(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, '').toUpperCase();
  return normalized || null;
}

export interface RechargeSubmission {
  transactionRef?: unknown;
  amount?: unknown;
  utrNumber?: unknown;
  paymentDetails?: unknown;
}

/**
 * Records a tenant's claim that it paid for credits. No credits are added
 * until a platform admin approves the request.
 */
export async function submitRechargeRequest(user: AuthenticatedUser, submission: RechargeSubmission) {
  const amount = Number(submission.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > MAX_RECHARGE_AMOUNT) {
    throw new RechargeRequestError(`Amount must be a whole number between 1 and ${MAX_RECHARGE_AMOUNT}`, 400);
  }

  const transactionRef = typeof submission.transactionRef === 'string' ? submission.transactionRef.trim() : '';
  if (!transactionRef || transactionRef.length > 100) {
    throw new RechargeRequestError('A transaction reference of up to 100 characters is required', 400);
  }

  const paymentDetails =
    submission.paymentDetails && typeof submission.paymentDetails === 'object' && !Array.isArray(submission.paymentDetails)
      ? (submission.paymentDetails as Prisma.InputJsonObject)
      : undefined;

  try {
    return await prisma.credit_recharge_requests.create({
      data: {
        id: `recharge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId: user.clientId,
        requestedById: user.id,
        amount,
        transactionRef,
        utrNumber: normalizeUtr(submission.utrNumber),
        paymentDetails,
        status: 'pending'
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new RechargeRequestError('This payment has already been submitted', 409);
    }
    throw error;
  }
}

export async function listRechargeRequests({ clientId, status }: { clientId?: string; status?: RechargeStatus } = {}) {
  return prisma.credit_recharge_requests.findMany({
    where: { ...(clientId && { clientId }), ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      clients: { select: { id: true, companyName: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      reviewedBy: { select: { id: true, name: true } }
    }
  });
}

/**
 * Approves or rejects a pending request exactly once. Approval and the credit
 * addition commit in one transaction.
 */
export async function reviewRechargeRequest(
  reviewer: AuthenticatedUser,
  requestId: string,
  action: 'approve' | 'reject',
  note?: string
) {
  const reviewNote = typeof note === 'string' && note.trim() ? note.trim().slice(0, 500) : null;

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.credit_recharge_requests.updateMany({
      where: { id: requestId, status: 'pending' },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewedById: reviewer.id,
        reviewedAt: new Date(),
        reviewNote
      }
    });

    if (count === 0) {
      const existing = await tx.credit_recharge_requests.findUnique({ where: { id: requestId }, select: { status: true } });
      throw existing
        ? new RechargeRequestError(`This request was already ${existing.status}`, 409)
        : new RechargeRequestError('Recharge request not found', 404);
    }

    const request = await tx.credit_recharge_requests.findUniqueOrThrow({
      where: { id: requestId },
      include: { clients: { select: { companyName: true } } }
    });

    if (action === 'reject') {
      return { request, credits: null };
    }

    const description = [`Credit recharge via UPI - ${request.transactionRef}`, request.utrNumber && `UTR: ${request.utrNumber}`, `approved by ${reviewer.email}`]
      .filter(Boolean)
      .join(' | ');

    const { credits, transactionId } = await CreditService.addCreditsInTransaction(tx, request.clientId, request.amount, description, {
      userId: reviewer.id,
      clientName: request.clients.companyName,
      utrNumber: request.utrNumber
    });

    const approved = await tx.credit_recharge_requests.update({
      where: { id: requestId },
      data: { creditTransactionId: transactionId }
    });

    return { request: approved, credits };
  });
}
