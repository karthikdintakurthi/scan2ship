import { prisma } from '@/lib/prisma';

export type CreditBalance = {
  balance: number;
  unit: 'credit';
  notes: string;
};

/**
 * Tenant credit balance without creating a ledger row as a side effect.
 */
export async function getCreditBalanceReadOnly(tenantId: string): Promise<CreditBalance> {
  const row = await prisma.client_credits.findUnique({
    where: { clientId: tenantId },
    select: { balance: true },
  });
  return {
    balance: row?.balance ?? 0,
    unit: 'credit',
    notes: 'Integer shipping credits. One credit is typically consumed when a shipment is booked.',
  };
}
