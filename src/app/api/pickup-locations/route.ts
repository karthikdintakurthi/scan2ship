import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

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
      requireActiveClient: false // We'll handle client filtering manually
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    // Get clientId from query parameters if provided
    const { searchParams } = new URL(request.url);
    const requestedClientId = searchParams.get('clientId');

    // Build where clause based on user role and requested client
    let whereClause = {};
    
    if (user.role === 'master_admin') {
      // Master admin can see all pickup locations or filter by specific client
      if (requestedClientId) {
        whereClause = { clientId: requestedClientId };
      } else {
        whereClause = {}; // All pickup locations
      }
    } else if (user.role === 'child_user') {
      // Child users see only their assigned pickup locations
      const userPickupLocations = await prisma.user_pickup_locations.findMany({
        where: { userId: user.id },
        select: { pickupLocationId: true }
      });
      
      const assignedPickupLocationIds = userPickupLocations.map(up => up.pickupLocationId);
      
      if (assignedPickupLocationIds.length > 0) {
        whereClause = { 
          id: { in: assignedPickupLocationIds },
          clientId: user.clientId 
        };
      } else {
        // No assigned pickup locations, return empty array
        whereClause = { id: 'nonexistent' };
      }
    } else {
      // Other roles see only their client's pickup locations
      whereClause = { clientId: user.clientId };
    }

    // Get pickup locations based on user role and client filter
    const pickupLocations = await prisma.pickup_locations.findMany({
      where: whereClause,
      orderBy: {
        label: 'asc'
      }
    });

    const response = NextResponse.json({
      success: true,
      data: pickupLocations
    });

    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('Pickup locations API error:', error);
    const response = NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}