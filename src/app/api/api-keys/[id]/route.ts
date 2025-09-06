import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// PUT /api/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const { name, permissions, isActive } = await request.json();

    const apiKey = await prisma.api_keys.findFirst({
      where: { 
        id,
        clientId: user.clientId 
      }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    const updatedApiKey = await prisma.api_keys.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(permissions && { permissions }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      apiKey: {
        id: updatedApiKey.id,
        name: updatedApiKey.name,
        key: updatedApiKey.key,
        permissions: updatedApiKey.permissions,
        lastUsedAt: updatedApiKey.lastUsedAt,
        expiresAt: updatedApiKey.expiresAt,
        isActive: updatedApiKey.isActive,
        createdAt: updatedApiKey.createdAt,
        updatedAt: updatedApiKey.updatedAt
      }
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('API Keys PUT error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}

// DELETE /api/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    const { id } = await params;

    const apiKey = await prisma.api_keys.findFirst({
      where: { 
        id,
        clientId: user.clientId 
      }
    });

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    await prisma.api_keys.update({
      where: { id },
      data: { 
        isActive: false,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'API key deactivated successfully'
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('API Keys DELETE error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
