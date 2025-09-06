import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

export interface AuthenticatedApiKey {
  id: string;
  name: string;
  key: string;
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

  const apiKey = authHeader.substring(7);
  
  // Temporary hardcoded API key for testing
  if (apiKey === 'sk_karthik_admin_m3t2z3kww7t') {
    console.log('🔑 [API_KEY_AUTH] Using hardcoded API key for testing');
    return {
      id: 'temp-api-key-001',
      name: 'Karthik Admin Key (Temporary)',
      key: apiKey,
      clientId: 'default-client-001',
      permissions: ['*'],
      lastUsedAt: new Date(),
      expiresAt: null,
      isActive: true
    };
  }
  
  try {
    const keyRecord = await prisma.api_keys.findUnique({
      where: { key: apiKey },
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
      key: keyRecord.key,
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

export function hasPermission(apiKey: AuthenticatedApiKey, requiredPermission: string): boolean {
  return apiKey.permissions.includes(requiredPermission) || apiKey.permissions.includes('*');
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
