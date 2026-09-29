/**
 * Canonical form for stored and compared emails. Login lower-cases the address,
 * so every place that saves one must too, or the account cannot sign in.
 */
export function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
