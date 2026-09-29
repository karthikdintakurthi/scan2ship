import crypto from 'crypto';
import { API_KEY_SCOPES, hashApiKey, isApiKeyScope, type ApiKeyScope } from '@/lib/api-key-auth';

export const DEFAULT_API_KEY_LIFETIME_DAYS = 365;
export const MAX_API_KEY_LIFETIME_DAYS = 365;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseApiKeyScopes(input: unknown): Parsed<ApiKeyScope[]> {
  if (!Array.isArray(input) || input.length === 0) {
    return { ok: false, error: `permissions must be a non-empty list of: ${API_KEY_SCOPES.join(', ')}` };
  }
  const unknown = input.filter((scope) => !isApiKeyScope(scope));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown permissions: ${unknown.map(String).join(', ')}. Allowed: ${API_KEY_SCOPES.join(', ')}` };
  }
  return { ok: true, value: [...new Set(input as ApiKeyScope[])] };
}

export function parseApiKeyExpiry(expiresInDays: unknown, now = new Date()): Parsed<Date> {
  const days = expiresInDays === undefined || expiresInDays === null ? DEFAULT_API_KEY_LIFETIME_DAYS : Number(expiresInDays);
  if (!Number.isSafeInteger(days) || days < 1 || days > MAX_API_KEY_LIFETIME_DAYS) {
    return { ok: false, error: `expiresInDays must be a whole number from 1 to ${MAX_API_KEY_LIFETIME_DAYS}` };
  }
  return { ok: true, value: new Date(now.getTime() + days * 24 * 60 * 60 * 1000) };
}

/** A new raw key, its stored hash, and the prefix shown in listings. */
export function generateApiKey() {
  const raw = `sk_${crypto.randomBytes(32).toString('hex')}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) };
}

export function toApiKeyDto(row: {
  id: string;
  name: string;
  keyPrefix: string | null;
  permissions: string[];
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt?: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    permissions: row.permissions,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    ...(row.updatedAt && { updatedAt: row.updatedAt })
  };
}
