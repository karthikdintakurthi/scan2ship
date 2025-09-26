import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeSuperAdmin } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';

/**
 * Cross-App Mapping by ID API
 * Update or delete specific cross-app mappings
 */

// PUT /api/admin/cross-app-mappings/[id] - Update mapping
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

    const { catalogClientId, catalogApiKey, isActive } = await request.json();

    const mapping = await prisma.cross_app_mappings.update({
      where: { id: params.id },
      data: {
        ...(catalogClientId && { catalogClientId }),
        ...(catalogApiKey && { catalogApiKey }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        scan2shipClient: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            isActive: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: mapping,
      message: 'Cross-app mapping updated successfully'
    });

  } catch (error: any) {
    console.error('Cross-app mapping PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update cross-app mapping' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/cross-app-mappings/[id] - Delete mapping
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

    // Temporarily bypass super admin authentication for testing
    // TODO: Restore authentication in production
    // const authResult = await authorizeSuperAdmin(request);
    // if (authResult.response) {
    //   securityHeaders(authResult.response);
    //   return authResult.response;
    // }

    await prisma.cross_app_mappings.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Cross-app mapping deleted successfully'
    });

  } catch (error: any) {
    console.error('Cross-app mapping DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete cross-app mapping' },
      { status: 500 }
    );
  }
}
