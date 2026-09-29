import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';

type OrderQueryArgs = Omit<Prisma.ordersFindFirstArgs, 'where'>;

/**
 * Orders the user may see: their tenant's orders, and for child users only
 * orders in their sub-group or created by them.
 */
export async function orderAccessWhere(user: AuthenticatedUser): Promise<Prisma.ordersWhereInput> {
  const tenantScope: Prisma.ordersWhereInput = { clientId: user.clientId };

  if (user.role !== UserRole.CHILD_USER) {
    return tenantScope;
  }

  const membership = await prisma.user_sub_groups.findFirst({
    where: { userId: user.id },
    select: { subGroups: { select: { name: true } } },
  });
  const subGroupName = membership?.subGroups?.name;

  if (subGroupName) {
    return { ...tenantScope, OR: [{ sub_group: subGroupName }, { created_by: user.id }] };
  }
  return { ...tenantScope, created_by: user.id };
}

export function parseOrderId(value: string): number | null {
  const orderId = Number(value);
  return Number.isSafeInteger(orderId) && orderId > 0 ? orderId : null;
}

/**
 * Returns the order only if the user may access it. Inaccessible and missing
 * orders both return null so callers cannot reveal other tenants' order IDs.
 */
export async function findAccessibleOrder<T extends OrderQueryArgs>(
  user: AuthenticatedUser,
  orderId: number,
  args?: Prisma.SelectSubset<T, OrderQueryArgs>
): Promise<Prisma.ordersGetPayload<T> | null> {
  const where = { id: orderId, ...(await orderAccessWhere(user)) };
  const order = await prisma.orders.findFirst({ ...(args as OrderQueryArgs), where });
  return order as Prisma.ordersGetPayload<T> | null;
}

/**
 * Pickup locations the user may see. Child users are limited to assigned
 * locations; everyone else in the tenant sees the tenant's locations.
 */
export async function pickupAccessWhere(user: AuthenticatedUser): Promise<Prisma.pickup_locationsWhereInput> {
  const tenantScope: Prisma.pickup_locationsWhereInput = { clientId: user.clientId };
  if (user.role !== UserRole.CHILD_USER) {
    return tenantScope;
  }

  const assigned = await prisma.user_pickup_locations.findMany({
    where: { userId: user.id },
    select: { pickupLocationId: true },
  });
  if (assigned.length === 0) {
    return { ...tenantScope, id: { in: [] } };
  }
  return { ...tenantScope, id: { in: assigned.map((row) => row.pickupLocationId) } };
}
