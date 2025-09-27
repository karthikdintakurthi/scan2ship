import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: false // We'll check this after getting the user
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const userId = params.id;

    // Check if user can access this user's data
    if (user.role !== 'master_admin' && user.id !== userId && user.clientId !== user.clientId) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to view this user' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    // Get user with all related data
    const userData = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        clientId: true,
        parentUserId: true,
        createdBy: true,
        clients: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        userSubGroups: {
          select: {
            subGroups: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        userPickupLocations: {
          select: {
            pickup_locations: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        _count: {
          select: {
            childUsers: true
          }
        }
      }
    });

    if (!userData) {
      const response = NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
      securityHeaders(response);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      data: userData
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('User detail API error:', error);
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
      requireActiveClient: false // We'll check this after getting the user
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const userId = params.id;

    // Check if user can edit this user
    if (user.role !== 'master_admin' && user.id !== userId) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to edit this user' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const body = await request.json();
    const { 
      clientId, 
      email, 
      name, 
      password, 
      role, 
      isActive, 
      subGroupIds, 
      pickupLocationIds 
    } = body;

    // Validate required fields
    if (!email || !name || !role) {
      const response = NextResponse.json(
        { error: 'Email, name, and role are required' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Check if email is already taken by another user
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        id: { not: userId }
      }
    });

    if (existingUser) {
      const response = NextResponse.json(
        { error: 'Email is already taken by another user' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Hash password if provided
    let hashedPassword = undefined;
    if (password) {
      const bcrypt = require('bcrypt');
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update user
    const updateData: any = {
      email,
      name,
      role,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date()
    };

    if (clientId) {
      updateData.clientId = clientId;
    }

    if (hashedPassword) {
      updateData.password = hashedPassword;
    }

    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: updateData
    });

    // Update sub-group assignments
    if (subGroupIds !== undefined) {
      // Remove existing assignments
      await prisma.user_sub_groups.deleteMany({
        where: { userId }
      });

      // Add new assignments
      if (subGroupIds.length > 0) {
        await prisma.user_sub_groups.createMany({
          data: subGroupIds.map((subGroupId: string) => ({
            id: crypto.randomUUID(),
            userId,
            subGroupId
          }))
        });
      }
    }

    // Update pickup location assignments
    if (pickupLocationIds !== undefined) {
      // Remove existing assignments
      await prisma.user_pickup_locations.deleteMany({
        where: { userId }
      });

      // Add new assignments
      if (pickupLocationIds.length > 0) {
        await prisma.user_pickup_locations.createMany({
          data: pickupLocationIds.map((locationId: string) => ({
            id: crypto.randomUUID(),
            userId,
            pickupLocationId: locationId
          }))
        });
      }
    }

    const response = NextResponse.json({
      success: true,
      data: updatedUser
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('User update API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}