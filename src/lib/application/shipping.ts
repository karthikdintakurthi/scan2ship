import { prisma } from '@/lib/prisma';
import { pickupAccessWhere } from '@/lib/application/policy';
import type { QuoteShippingInput } from '@/lib/application/schemas';
import type { AuthenticatedUser } from '@/lib/auth-middleware';
import { McpToolError } from '@/lib/mcp/errors';

type CourierRow = {
  code: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
  baseRate: number | null;
  ratePerKg: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  codCharges: number | null;
  freeShippingThreshold: number | null;
  estimatedDays: number | null;
};

export function calculateConfiguredRate(courier: CourierRow, weightGrams: number, packageValueInr: number, isCod: boolean): number {
  if (courier.freeShippingThreshold != null && packageValueInr >= courier.freeShippingThreshold) {
    return 0;
  }
  let rate = courier.baseRate ?? 0;
  if (courier.ratePerKg != null && courier.minWeight != null) {
    const weightKg = weightGrams / 1000;
    const minKg = courier.minWeight / 1000;
    if (weightKg > minKg) {
      rate += (weightKg - minKg) * courier.ratePerKg;
    }
  }
  if (isCod && courier.codCharges) rate += courier.codCharges;
  return Math.round(rate * 100) / 100;
}

export async function listShippingOptions(user: AuthenticatedUser) {
  const pickupWhere = await pickupAccessWhere(user);
  const [pickups, couriers] = await Promise.all([
    prisma.pickup_locations.findMany({
      where: pickupWhere,
      select: { id: true, value: true, label: true },
      orderBy: { label: 'asc' },
    }),
    prisma.courier_services.findMany({
      where: { clientId: user.clientId, isActive: true },
      select: {
        code: true,
        name: true,
        isActive: true,
        isDefault: true,
        estimatedDays: true,
        minWeight: true,
        maxWeight: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    }),
  ]);

  return {
    pickupLocations: pickups.map((row) => ({ id: row.id, name: row.label, value: row.value })),
    courierServices: couriers.map((row) => ({
      code: row.code,
      name: row.name,
      isDefault: row.isDefault,
      estimatedDays: row.estimatedDays,
      minWeightGrams: row.minWeight,
      maxWeightGrams: row.maxWeight,
    })),
  };
}

export async function quoteShipping(user: AuthenticatedUser, input: QuoteShippingInput) {
  const couriers = await prisma.courier_services.findMany({
    where: {
      clientId: user.clientId,
      isActive: true,
      ...(input.courierCode ? { code: input.courierCode } : {}),
    },
  });
  if (couriers.length === 0) {
    throw new McpToolError('not_found', 'No matching courier service');
  }

  const estimates = couriers
    .filter((courier) => courier.baseRate != null || courier.ratePerKg != null)
    .filter((courier) => courier.maxWeight == null || input.weightGrams <= courier.maxWeight)
    .map((courier) => ({
      kind: 'configured_estimate' as const,
      courierCode: courier.code,
      courierName: courier.name,
      amountInr: calculateConfiguredRate(courier, input.weightGrams, input.packageValueInr, input.isCod),
      currency: 'INR',
      estimatedDays: courier.estimatedDays,
      liveCarrierQuote: false,
    }))
    .sort((a, b) => a.amountInr - b.amountInr);

  return {
    kind: 'configured_estimate' as const,
    weightGrams: input.weightGrams,
    packageValueInr: input.packageValueInr,
    isCod: input.isCod,
    currency: 'INR',
    estimates,
  };
}
