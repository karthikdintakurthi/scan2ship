import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel, canManageSubGroups } from '@/lib/auth-middleware';
import crypto from 'crypto';

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

    // Check if user can manage sub-groups (only for write operations)
    // For read operations, allow all users to see sub-groups
    if (request.method !== 'GET' && !canManageSubGroups(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to manage sub-groups' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    // Get clientId from query parameters if provided
    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get('clientId');

    let subGroups;
    
    if (user.role === 'child_user') {
      // Child users can only see their own sub-groups
      console.log('🔍 [API_SUB_GROUPS_GET] Fetching sub-groups for child user:', user.id);
      
      subGroups = await prisma.sub_groups.findMany({
        where: {
          clientId: user.clientId,
          userSubGroups: {
            some: {
              userId: user.id
            }
          }
        },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          userSubGroups: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              userSubGroups: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    } else if (user.role === 'master_admin') {
      // Master admin can see all sub-groups or filter by specific client
      const whereClause = requestedClientId ? { clientId: requestedClientId } : {};
      
      subGroups = await prisma.sub_groups.findMany({
        where: whereClause,
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          userSubGroups: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              userSubGroups: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } else {
      // Other roles (user, client_admin, super_admin) see all sub-groups for their client
      subGroups = await prisma.sub_groups.findMany({
        where: { clientId: user.clientId },
        include: {
          clients: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          userSubGroups: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          },
          _count: {
            select: {
              userSubGroups: true
            }
          }
        },
        orderBy: {
          name: 'asc'
        }
      });
    }

    const response = NextResponse.json({
      success: true,
      data: subGroups
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Sub-groups API error:', error);
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

    // Check if user can manage sub-groups
    if (!canManageSubGroups(user)) {
      const response = NextResponse.json(
        { error: 'Insufficient permissions to create sub-groups' },
        { status: 403 }
      );
      securityHeaders(response);
      return response;
    }

    const body = await request.json();
    const { name, description, clientId } = body;

    // Validate required fields
    if (!name) {
      const response = NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // Determine target client ID
    const targetClientId = user.role === 'master_admin' ? clientId : user.clientId;
    
    if (!targetClientId) {
      const response = NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    // For master admin, verify the client exists
    if (user.role === 'master_admin') {
      const client = await prisma.clients.findUnique({
        where: { id: targetClientId }
      });
      
      if (!client) {
        const response = NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
        securityHeaders(response);
        return response;
      }
    }

    // Check if sub-group with same name already exists in this client
    const existingSubGroup = await prisma.sub_groups.findFirst({
      where: {
        name,
        clientId: targetClientId
      }
    });

    if (existingSubGroup) {
      const response = NextResponse.json(
        { error: 'Sub-group with this name already exists in this client' },
        { status: 409 }
      );
      securityHeaders(response);
      return response;
    }

    // Create sub-group
    const newSubGroup = await prisma.sub_groups.create({
      data: {
        id: crypto.randomUUID(),
        name,
        description: description || null,
        clientId: targetClientId,
        isActive: true,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      data: newSubGroup
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Create sub-group error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
