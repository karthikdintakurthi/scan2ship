import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findAccessibleOrder, orderAccessWhere, parseOrderId } from '@/lib/application/policy';
import type { SearchOrdersInput } from '@/lib/application/schemas';
import type { AuthenticatedUser } from '@/lib/auth-middleware';
import { hasScope, type McpScope } from '@/lib/mcp/scopes';
import { McpToolError } from '@/lib/mcp/errors';

const MAX_DATE_RANGE_MS = 90 * 24 * 60 * 60 * 1000;

const LIST_SELECT = {
  id: true,
  reference_number: true,
  tracking_id: true,
  tracking_status: true,
  courier_service: true,
  pickup_location: true,
  created_at: true,
  updated_at: true,
  is_cod: true,
  weight: true,
  package_value: true,
  name: true,
  city: true,
  state: true,
  pincode: true,
} satisfies Prisma.ordersSelect;

const DETAIL_SELECT = {
  ...LIST_SELECT,
  country: true,
  mobile: true,
  address: true,
  total_items: true,
  product_description: true,
  delhivery_waybill_number: true,
  delhivery_api_status: true,
  sub_group: true,
} satisfies Prisma.ordersSelect;

type ListRow = Prisma.ordersGetPayload<{ select: typeof LIST_SELECT }>;
type DetailRow = Prisma.ordersGetPayload<{ select: typeof DETAIL_SELECT }>;

export type OrderListItem = {
  id: number;
  referenceNumber: string | null;
  trackingId: string | null;
  trackingStatus: string | null;
  courierService: string;
  pickupLocation: string;
  createdAt: string;
  isCod: boolean;
  weightGrams: number;
  packageValueInr: number;
  recipientName: string;
  city: string;
  state: string;
  pincode: string;
};

export type OrderDetail = OrderListItem & {
  country: string;
  totalItems: number;
  productDescription: string | null;
  waybillNumber: string | null;
  bookingStatus: string | null;
  subGroup: string | null;
  mobile: string | null;
  address: string | null;
};

function encodeCursor(createdAt: Date, id: number): string {
  return Buffer.from(JSON.stringify({ t: createdAt.toISOString(), id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { t: Date; id: number } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { t?: string; id?: number };
    if (!parsed.t || !Number.isSafeInteger(parsed.id)) return null;
    const t = new Date(parsed.t);
    if (Number.isNaN(t.getTime())) return null;
    return { t, id: parsed.id };
  } catch {
    return null;
  }
}

function maskPhone(mobile: string | null): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

function toListItem(row: ListRow): OrderListItem {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    trackingId: row.tracking_id,
    trackingStatus: row.tracking_status,
    courierService: row.courier_service,
    pickupLocation: row.pickup_location,
    createdAt: row.created_at.toISOString(),
    isCod: row.is_cod,
    weightGrams: row.weight,
    packageValueInr: row.package_value,
    recipientName: row.name,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
  };
}

function toDetail(row: DetailRow, includePii: boolean): OrderDetail {
  return {
    ...toListItem(row),
    country: row.country,
    totalItems: row.total_items,
    productDescription: row.product_description,
    waybillNumber: row.delhivery_waybill_number,
    bookingStatus: row.delhivery_api_status,
    subGroup: row.sub_group,
    mobile: includePii ? row.mobile : maskPhone(row.mobile),
    address: includePii ? row.address : null,
  };
}

export async function searchOrders(
  user: AuthenticatedUser,
  input: SearchOrdersInput
): Promise<{ orders: OrderListItem[]; nextCursor: string | null; hasMore: boolean }> {
  const access = await orderAccessWhere(user);
  const filters: Prisma.ordersWhereInput[] = [access];

  if (input.query) {
    filters.push({
      OR: [
        { name: { contains: input.query, mode: 'insensitive' } },
        { mobile: { contains: input.query, mode: 'insensitive' } },
        { tracking_id: { contains: input.query, mode: 'insensitive' } },
        { reference_number: { contains: input.query, mode: 'insensitive' } },
      ],
    });
  }
  if (input.trackingStatus) filters.push({ tracking_status: input.trackingStatus });
  if (input.courierService) filters.push({ courier_service: input.courierService });
  if (input.pickupLocation) filters.push({ pickup_location: input.pickupLocation });

  if (input.from || input.to) {
    const from = input.from ? new Date(input.from) : undefined;
    const to = input.to ? new Date(input.to) : undefined;
    if (from && Number.isNaN(from.getTime())) throw new McpToolError('invalid_params', 'Invalid from date');
    if (to && Number.isNaN(to.getTime())) throw new McpToolError('invalid_params', 'Invalid to date');
    if (from && to && to.getTime() - from.getTime() > MAX_DATE_RANGE_MS) {
      throw new McpToolError('invalid_params', 'Date range cannot exceed 90 days');
    }
    filters.push({
      created_at: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    });
  }

  if (input.cursor) {
    const cursor = decodeCursor(input.cursor);
    if (!cursor) throw new McpToolError('invalid_params', 'Invalid cursor');
    filters.push({
      OR: [
        { created_at: { lt: cursor.t } },
        { AND: [{ created_at: cursor.t }, { id: { lt: cursor.id } }] },
      ],
    });
  }

  const limit = input.limit ?? 20;
  const rows = await prisma.orders.findMany({
    where: { AND: filters },
    select: LIST_SELECT,
    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const last = page[page.length - 1];
  return {
    orders: page.map(toListItem),
    nextCursor: hasMore && last ? encodeCursor(last.created_at, last.id) : null,
    hasMore,
  };
}

export async function getOrder(
  user: AuthenticatedUser,
  orderId: number,
  scopes: readonly McpScope[] | readonly string[]
): Promise<OrderDetail> {
  if (!parseOrderId(String(orderId))) {
    throw new McpToolError('invalid_params', 'Invalid order id');
  }
  const order = await findAccessibleOrder(user, orderId, { select: DETAIL_SELECT });
  if (!order) throw new McpToolError('not_found', 'Order not found');
  return toDetail(order, hasScope(scopes, 'customers:read'));
}

export async function getTrackingStatus(
  user: AuthenticatedUser,
  input: { orderId?: number; trackingId?: string }
) {
  const access = await orderAccessWhere(user);
  const order = input.orderId
    ? await findAccessibleOrder(user, input.orderId, { select: DETAIL_SELECT })
    : await prisma.orders.findFirst({
        where: { AND: [access, { OR: [{ tracking_id: input.trackingId }, { delhivery_waybill_number: input.trackingId }] }] },
        select: DETAIL_SELECT,
      });

  if (!order) throw new McpToolError('not_found', 'Shipment not found');

  return {
    orderId: order.id,
    trackingId: order.tracking_id,
    waybillNumber: order.delhivery_waybill_number,
    trackingStatus: order.tracking_status,
    bookingStatus: order.delhivery_api_status,
    courierService: order.courier_service,
    source: 'persisted',
    refreshedFromCarrier: false,
    lastUpdatedAt: order.updated_at.toISOString(),
  };
}
