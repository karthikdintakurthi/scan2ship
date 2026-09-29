/**
 * Response shapes for records that hold integration secrets. The secret is
 * replaced by `hasApiKey`; callers that need the key read it server-side.
 */

export type PickupLocationDto<T> = Omit<T, 'delhiveryApiKey'> & { hasApiKey: boolean };
export type CrossAppMappingDto<T> = Omit<T, 'catalogApiKey'> & { hasApiKey: boolean };

export function toPickupLocationDto<T extends { delhiveryApiKey?: string | null }>(location: T): PickupLocationDto<T> {
  const { delhiveryApiKey, ...rest } = location;
  return { ...rest, hasApiKey: Boolean(delhiveryApiKey?.trim()) };
}

export function toCrossAppMappingDto<T extends { catalogApiKey?: string | null }>(mapping: T): CrossAppMappingDto<T> {
  const { catalogApiKey, ...rest } = mapping;
  return { ...rest, hasApiKey: Boolean(catalogApiKey?.trim()) };
}

const MASK_CHARACTER = '•';

/**
 * Key to store when a form is saved. Forms no longer receive the stored key,
 * so a blank or masked value means "keep the current key"; `clear` removes it.
 */
export function resolveSubmittedApiKey(
  submitted: unknown,
  existing: string | null | undefined,
  { clear = false }: { clear?: boolean } = {}
): string | null {
  if (clear) return null;
  if (typeof submitted !== 'string') return existing ?? null;

  const trimmed = submitted.trim();
  if (!trimmed || trimmed.startsWith(MASK_CHARACTER)) return existing ?? null;
  return trimmed;
}
