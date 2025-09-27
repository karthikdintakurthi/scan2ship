import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel, canManageUsers, canCreateChildUsers } from '@/lib/auth-middleware';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [API_USERS_GET] Starting users API request');
    
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      console.log('🚫 [API_USERS_GET] Security middleware blocked request');
      securityHeaders(securityResponse);
      return securityResponse;
    }

    console.log('🔍 [API_USERS_GET] Security middleware passed, authorizing user');
    
    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CLIENT_ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: false // We'll check this after getting the user
    });

    if (authResult.response) {
      console.log('🚫 [API_USERS_GET] Authorization failed:', authResult.response.status);
      securityHeaders(authResult.response);
      return authResult.response;
    }

    console.log('✅ [API_USERS_GET] Authorization successful');

    const user = authResult.user!;
    console.log('🔍 [API_USERS_GET] User details:', { id: user.id, email: user.email, role: user.role });

    // Check if user can manage users
    const canManage = canManageUsers(user);
    console.log('🔍 [API_USERS_GET] Can manage users:', canManage);
    
    if (!canManage) {
      console.log('🚫 [API_USERS_GET] User cannot manage users, returning 403');
      const response = NextResponse.json(
        { error: 'Insufficient permissions to view users' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    // Get users based on role
    let users;
    
    if (user.role === 'master_admin') {
      // Master admin can see all users with client information
      console.log('🔍 [API_USERS_GET] Fetching all users for master admin');
      users = await prisma.users.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          parentUserId: true,
          createdBy: true,
          clientId: true,
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
        },
        orderBy: [
          { clients: { companyName: 'asc' } },
          { createdAt: 'desc' }
        ]
      });
    } else {
      // Other roles see only their client's users
      console.log('🔍 [API_USERS_GET] Fetching users for client:', user.clientId);
      users = await prisma.users.findMany({
        where: {
          clientId: user.clientId
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
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
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }
    
    console.log('🔍 [API_USERS_GET] Found users:', users.length);

    const response = NextResponse.json({
      success: true,
      data: users
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Users API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}

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

    // Check if user can create child users
    if (!canCreateChildUsers(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to create users' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const body = await request.json();
    const { 
      email, 
      name, 
      password, 
      role = 'child_user', 
      subGroupIds = [], 
      pickupLocationIds = [] 
    } = body;

    // Validate required fields
    if (!email || !name) {
      const response = NextResponse.json(
        { error: 'Email and name are required' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Validate role
    const validRoles = ['child_user', 'user', 'client_admin'];
    if (!validRoles.includes(role)) {
      const response = NextResponse.json(
        { error: 'Invalid role. Must be one of: child_user, user, client_admin' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Check if email already exists in this client
    const existingUser = await prisma.users.findFirst({
      where: {
        email,
        clientId: user.clientId
      }
    });

    if (existingUser) {
      const response = NextResponse.json(
        { error: 'User with this email already exists in this client' },
        { status: 409 }
      );
      securityHeaders(response);
      return response;
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const bcrypt = require('bcrypt');
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create user
    const newUser = await prisma.users.create({
      data: {
        id: crypto.randomUUID(),
        email,
        name,
        password: hashedPassword,
        role,
        clientId: user.clientId,
        parentUserId: role === 'child_user' ? user.id : null,
        createdBy: user.id,
        isActive: true,
        updatedAt: new Date()
      }
    });

    // Assign sub-groups if provided
    if (subGroupIds.length > 0) {
      await prisma.user_sub_groups.createMany({
        data: subGroupIds.map((subGroupId: string) => ({
          id: crypto.randomUUID(),
          userId: newUser.id,
          subGroupId
        }))
      });
    }

    // Assign pickup locations if provided
    if (pickupLocationIds.length > 0) {
      await prisma.user_pickup_locations.createMany({
        data: pickupLocationIds.map((pickupLocationId: string) => ({
          id: crypto.randomUUID(),
          userId: newUser.id,
          pickupLocationId
        }))
      });
    }

    // Fetch the created user with relations
    const createdUser = await prisma.users.findUnique({
      where: { id: newUser.id },
      include: {
        userSubGroups: {
          include: {
            subGroups: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        userPickupLocations: {
          include: {
            pickup_locations: {
              select: {
                id: true,
                label: true
              }
            }
          }
        },
        parentUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    const response = NextResponse.json({
      success: true,
      data: createdUser
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Create user error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
