import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { generateApiKey, parseApiKeyExpiry, parseApiKeyScopes, toApiKeyDto } from '@/lib/application/api-key-provisioning';

// GET /api/api-keys - List API keys for the client
export async function GET(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const apiKeys = await prisma.api_keys.findMany({
      where: { 
        clientId: user.clientId,
        isActive: true 
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = NextResponse.json({ apiKeys: apiKeys.map(toApiKeyDto) });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('API Keys GET error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}

// POST /api/api-keys - Create new API key
export async function POST(request: NextRequest) {
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Keys act for the whole tenant, so only tenant admins may issue them
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const { name, permissions = ['orders:read'], expiresInDays } = (await request.json()) ?? {};

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    const scopes = parseApiKeyScopes(permissions);
    if (!scopes.ok) {
      return NextResponse.json({ error: scopes.error }, { status: 400 });
    }

    const expiry = parseApiKeyExpiry(expiresInDays);
    if (!expiry.ok) {
      return NextResponse.json({ error: expiry.error }, { status: 400 });
    }

    const { raw, hash, prefix } = generateApiKey();

    const newApiKey = await prisma.api_keys.create({
      data: {
        id: crypto.randomUUID(),
        name,
        key: hash,
        keyPrefix: prefix,
        createdById: user.id,
        clientId: user.clientId,
        permissions: scopes.value,
        expiresAt: expiry.value,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Copy this key now. It will not be shown again.',
      apiKey: {
        ...toApiKeyDto(newApiKey),
        key: raw
      }
    }, { status: 201 });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('API Keys POST error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
