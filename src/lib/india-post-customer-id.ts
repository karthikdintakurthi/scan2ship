const CONFIG_KEY = 'india_post_customer_id';
const MAX_LENGTH = 80;
const ALLOWED = /^[A-Za-z0-9._\-\/ ]*$/;

export function normalizeIndiaPostCustomerId(raw: unknown): string {
  if (typeof raw !== 'string') {
    return '';
  }
  return raw.trim();
}

export function validateIndiaPostCustomerId(value: string): string | null {
  if (value.length > MAX_LENGTH) {
    return `Customer ID must be ${MAX_LENGTH} characters or fewer`;
  }
  if (value && !ALLOWED.test(value)) {
    return 'Customer ID may only contain letters, numbers, spaces, dots, hyphens, underscores, and slashes';
  }
  return null;
}

export function isIndiaPostCourier(courierService?: string | null): boolean {
  return typeof courierService === 'string' && courierService.toLowerCase() === 'india_post';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** HTML line shown under the waybill heading. Empty when not India Post or no ID saved. */
export function indiaPostCustomerIdHeadingHtml(
  courierService: string | undefined,
  customerId: string | null | undefined,
  className = 'customer-id'
): string {
  const value = (customerId || '').trim();
  if (!value || !isIndiaPostCourier(courierService)) {
    return '';
  }
  return `<div class="${className}">Customer ID: ${escapeHtml(value)}</div>`;
}

export const INDIA_POST_CUSTOMER_ID_KEY = CONFIG_KEY;
