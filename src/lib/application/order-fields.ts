/**
 * Order fields a caller may supply when creating an order. Tenant, creator,
 * sub-group, carrier and billing state, timestamps, and seller details are
 * set by the server and are never taken from the request.
 */
export const CREATABLE_ORDER_FIELDS = [
  'name',
  'mobile',
  'phone',
  'address',
  'city',
  'state',
  'country',
  'pincode',
  'courier_service',
  'pickup_location',
  'package_value',
  'weight',
  'total_items',
  'is_cod',
  'cod_amount',
  'reseller_name',
  'reseller_mobile',
  'product_description',
  'reference_number',
  'tracking_id',
  'products',
  'shipment_length',
  'shipment_breadth',
  'shipment_height',
  'fragile_shipment',
  'invoice_number',
  'invoice_date',
  'commodity_value',
  'tax_value',
  'category_of_goods',
  'hsn_code',
  'ewbn',
] as const;

export type CreatableOrderField = (typeof CREATABLE_ORDER_FIELDS)[number];

/** Returns only the creatable fields, plus the names of any fields that were dropped. */
export function pickCreatableOrderFields(input: unknown): {
  fields: Partial<Record<CreatableOrderField, unknown>>;
  ignored: string[];
} {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { fields: {}, ignored: [] };
  }
  const allowed = new Set<string>(CREATABLE_ORDER_FIELDS);
  const fields: Partial<Record<CreatableOrderField, unknown>> = {};
  const ignored: string[] = [];
  for (const [key, value] of Object.entries(input)) {
    if (allowed.has(key)) {
      fields[key as CreatableOrderField] = value;
    } else {
      ignored.push(key);
    }
  }
  return { fields, ignored };
}
