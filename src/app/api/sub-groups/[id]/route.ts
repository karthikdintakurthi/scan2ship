import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel, canManageSubGroups } from '@/lib/auth-middleware';

export async function GET(
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    // Check if user can manage sub-groups
    if (!canManageSubGroups(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to view sub-group details' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const subGroupId = params.id;

    // Get sub-group details
    const subGroup = await prisma.sub_groups.findFirst({
      where: {
        id: subGroupId,
        clientId: user.clientId
      },
      include: {
        userSubGroups: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                createdAt: true
              }
            }
          }
        },
        _count: {
          select: {
            userSubGroups: true
          }
        }
      }
    });

    if (!subGroup) {
      const response = NextResponse.json(
        { error: 'Sub-group not found' },
        { status: 404 }
      );
      securityHeaders(response);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: subGroup
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Get sub-group error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    // Check if user can manage sub-groups
    if (!canManageSubGroups(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to update sub-group' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const subGroupId = params.id;
    const body = await request.json();
    const { name, description, isActive } = body;

    // Check if sub-group exists and belongs to same client
    const existingSubGroup = await prisma.sub_groups.findFirst({
      where: {
        id: subGroupId,
        clientId: user.clientId
      }
    });

    if (!existingSubGroup) {
      const response = NextResponse.json(
        { error: 'Sub-group not found' },
        { status: 404 }
      );
      securityHeaders(response);
      return response;
    }

    // Check if new name conflicts with existing sub-group
    if (name && name !== existingSubGroup.name) {
      const conflictingSubGroup = await prisma.sub_groups.findUnique({
        where: {
          name_clientId: {
            name,
            clientId: user.clientId
          }
        }
      });

      if (conflictingSubGroup) {
        const response = NextResponse.json(
          { error: 'Sub-group with this name already exists in this client' },
          { status: 409 }
        );
        securityHeaders(response);
        return response;
      }
    }

    // Update sub-group
    const updatedSubGroup = await prisma.sub_groups.update({
      where: { id: subGroupId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      data: updatedSubGroup
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Update sub-group error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    // Check if user can manage sub-groups
    if (!canManageSubGroups(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to delete sub-group' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const subGroupId = params.id;

    // Check if sub-group exists and belongs to same client
    const existingSubGroup = await prisma.sub_groups.findFirst({
      where: {
        id: subGroupId,
        clientId: user.clientId
      },
      include: {
        _count: {
          select: {
            userSubGroups: true
          }
        }
      }
    });

    if (!existingSubGroup) {
      const response = NextResponse.json(
        { error: 'Sub-group not found' },
        { status: 404 }
      );
      securityHeaders(response);
      return response;
    }

    // Check if sub-group has users assigned
    if (existingSubGroup._count.userSubGroups > 0) {
      const response = NextResponse.json(
        { error: 'Cannot delete sub-group that has users assigned. Please reassign users first.' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Delete sub-group
    await prisma.sub_groups.delete({
      where: { id: subGroupId }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Sub-group deleted successfully'
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Delete sub-group error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
