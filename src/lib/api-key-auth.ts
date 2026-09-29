import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export const API_KEY_SCOPES = ['orders:read', 'orders:write', 'courier-services:read', 'courier-services:write'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const HASH_PREFIX = 'sha256:';

/** Keys are stored only as this hash; the raw key is shown once at creation. */
export function hashApiKey(rawKey: string): string {
  return HASH_PREFIX + crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
}

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
  return typeof value === 'string' && (API_KEY_SCOPES as readonly string[]).includes(value);
}

export interface AuthenticatedApiKey {
  id: string;
  name: string;
  keyPrefix: string | null;
  clientId: string;
  permissions: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export async function authenticateApiKey(request: NextRequest): Promise<AuthenticatedApiKey | null> {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7).trim();
  if (!apiKey) {
    return null;
  }

  try {
    const keyRecord = await prisma.api_keys.findUnique({
      where: { key: hashApiKey(apiKey) },
      include: {
        clients: true
      }
    });

    if (!keyRecord) {
      return null;
    }

    // Check if API key is active
    if (!keyRecord.isActive) {
      return null;
    }

    // Check if client is active
    if (!keyRecord.clients.isActive) {
      return null;
    }

    // Check if API key has expired
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await prisma.api_keys.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() }
    });

    return {
      id: keyRecord.id,
      name: keyRecord.name,
      keyPrefix: keyRecord.keyPrefix,
      clientId: keyRecord.clientId,
      permissions: keyRecord.permissions,
      lastUsedAt: keyRecord.lastUsedAt,
      expiresAt: keyRecord.expiresAt,
      isActive: keyRecord.isActive
    };
  } catch (error) {
    console.error('API key authentication error:', error);
    return null;
  }
}

/** Exact scope match only; wildcard grants are not honored. */
export function hasPermission(apiKey: AuthenticatedApiKey, requiredPermission: ApiKeyScope): boolean {
  return apiKey.permissions.includes(requiredPermission);
}

export function validateHmacSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('HMAC validation error:', error);
    return false;
  }
}
