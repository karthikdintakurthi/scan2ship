/**
 * Helpers for the public, unauthenticated shipment lookup.
 */

/** Returns the 10-digit Indian mobile number, or null if the input is not one. */
export function normalizeIndianMobile(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let mobile = digits;
  if (digits.length === 12 && digits.startsWith('91')) {
    mobile = digits.substring(2);
  } else if (digits.length === 13 && digits.startsWith('91')) {
    mobile = digits.substring(3);
  }
  return /^[6-9]\d{9}$/.test(mobile) ? mobile : null;
}

/** "Asha Kumari" -> "A*** K***" */
export function maskName(name: string | null | undefined): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '***';
  return words.map((word) => `${word[0]}***`).join(' ');
}

/** "9876543210" -> "******3210" */
export function maskMobile(mobile: string): string {
  return `${'*'.repeat(Math.max(0, mobile.length - 4))}${mobile.slice(-4)}`;
}
