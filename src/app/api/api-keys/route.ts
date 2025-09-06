import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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
        key: true,
        permissions: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        isActive: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const response = NextResponse.json({ apiKeys });
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const { name, permissions = ['orders:read'], expiresInDays } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 });
    }

    // Generate API key
    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
    const secret = crypto.randomBytes(32).toString('hex');

    // Calculate expiration date
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const newApiKey = await prisma.api_keys.create({
      data: {
        id: crypto.randomUUID(),
        name,
        key: apiKey,
        secret,
        clientId: user.clientId,
        permissions,
        expiresAt
      }
    });

    const response = NextResponse.json({
      success: true,
      apiKey: {
        id: newApiKey.id,
        name: newApiKey.name,
        key: newApiKey.key,
        secret: newApiKey.secret, // Only returned on creation
        permissions: newApiKey.permissions,
        expiresAt: newApiKey.expiresAt,
        createdAt: newApiKey.createdAt
      }
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('API Keys POST error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
