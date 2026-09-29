import { parseOrderId } from '@/lib/application/policy';

/** Accepts { orderId } or the order form's { orderNumber: 'ORDER-<id>' }. */
export function parseCatalogOrderId(data: any): number | null {
  if (data?.orderId !== undefined && data?.orderId !== null) return parseOrderId(String(data.orderId));
  const match = typeof data?.orderNumber === 'string' ? data.orderNumber.match(/^ORDER-(\d+)$/) : null;
  return match ? parseOrderId(match[1]) : null;
}

/** Items saved on the order by the order form: [{ product: { sku }, quantity }] or [{ sku, quantity }]. */
export function inventoryItemsFromOrder(products: unknown): { sku: string; quantity: number }[] {
  let parsed: unknown = products;
  if (typeof products === 'string') {
    try {
      parsed = JSON.parse(products);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: any) => ({ sku: item?.product?.sku || item?.sku, quantity: Number(item?.quantity) || 1 }))
    .filter((item) => typeof item.sku === 'string' && item.sku.length > 0 && Number.isSafeInteger(item.quantity) && item.quantity > 0);
}
