import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// GET /api/admin/credits - Get all clients with their credit balances
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API_ADMIN_CREDITS_GET] Request received');
    
    // Apply security middleware
    const securityResponse = applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize admin user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    console.log('📊 [API_ADMIN_CREDITS_GET] Fetching all clients with credits for admin:', authResult.user!.email);

    // Get all clients with their basic information
    const clients = await prisma.clients.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        companyName: true,
        email: true,
        phone: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            orders: true
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    });

    console.log(`✅ [API_ADMIN_CREDITS_GET] Found ${clients.length} active clients`);

    // Get credit balances for all clients
    const clientsWithCredits = await Promise.all(
      clients.map(async (client) => {
        try {
          const credits = await CreditService.getClientCredits(client.id);
          return {
            ...client,
            credits: {
              balance: credits?.balance || 0,
              totalAdded: credits?.totalAdded || 0,
              totalUsed: credits?.totalUsed || 0,
              lastUpdated: credits?.updatedAt || null
            }
          };
        } catch (error) {
          console.error(`❌ [API_ADMIN_CREDITS_GET] Error fetching credits for client ${client.id}:`, error);
          return {
            ...client,
            credits: {
              balance: 0,
              totalAdded: 0,
              totalUsed: 0,
              lastUpdated: null
            }
          };
        }
      })
    );

    console.log(`✅ [API_ADMIN_CREDITS_GET] Successfully fetched credits for ${clientsWithCredits.length} clients`);

    return NextResponse.json({
      success: true,
      data: {
        clients: clientsWithCredits,
        summary: {
          totalClients: clientsWithCredits.length,
          totalCredits: clientsWithCredits.reduce((sum, client) => sum + client.credits.balance, 0),
          totalAdded: clientsWithCredits.reduce((sum, client) => sum + client.credits.totalAdded, 0),
          totalUsed: clientsWithCredits.reduce((sum, client) => sum + client.credits.totalUsed, 0)
        }
      }
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CREDITS_GET] Error fetching clients with credits:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch clients with credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
