import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

/**
 * Individual API Key Management API
 * Handles updates and deletion of specific API keys
 */

// DELETE /api/admin/api-keys/[id] - Delete API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Authorize super admin
    const authResult = await authorizeSuperAdmin(request);
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id } = params;

    // Check if API key exists
    const apiKey = await prisma.api_keys.findUnique({
      where: { id }
    });

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Delete API key
    await prisma.api_keys.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'API key deleted successfully'
    });

  } catch (error: any) {
    console.error('API key DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/api-keys/[id] - Update API key
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    // Authorize super admin
    const authResult = await authorizeSuperAdmin(request);
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id } = params;
    const { name, isActive, permissions, expiresAt } = await request.json();

    // Check if API key exists
    const existingApiKey = await prisma.api_keys.findUnique({
      where: { id }
    });

    if (!existingApiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      );
    }

    // Update API key
    const updatedApiKey = await prisma.api_keys.update({
      where: { id },
      data: {
        name,
        isActive,
        permissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        updatedAt: new Date()
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedApiKey,
      message: 'API key updated successfully'
    });

  } catch (error: any) {
    console.error('API key PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update API key' },
      { status: 500 }
    );
  }
}
