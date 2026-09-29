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

/**
 * Why a courier or pickup location may not be used on an order, or null. The
 * courier must be active for the tenant and the pickup location one this user
 * may use (for child users, one assigned to them), as the order form and
 * list_shipping_options offer them. Only the fields given are checked.
 */
export async function courierOrPickupError(
  user: AuthenticatedUser,
  choice: { courier?: unknown; pickupLocation?: unknown }
): Promise<string | null> {
  const courierCode = choice.courier === undefined ? null : String(choice.courier).trim();
  const pickupValue = choice.pickupLocation === undefined ? null : String(choice.pickupLocation);
  const [courier, pickup] = await Promise.all([
    courierCode === null
      ? null
      : prisma.courier_services.findFirst({
          where: { clientId: user.clientId, isActive: true, code: { equals: courierCode, mode: 'insensitive' } },
          select: { code: true },
        }),
    pickupValue === null
      ? null
      : prisma.pickup_locations.findFirst({
          where: { AND: [await pickupAccessWhere(user), { value: pickupValue }] },
          select: { value: true },
        }),
  ]);
  if (courierCode !== null && !courier) return `Courier "${courierCode}" is not active for this account`;
  if (pickupValue !== null && !pickup) return `Pickup location "${pickupValue}" is not available to you`;
  return null;
}
