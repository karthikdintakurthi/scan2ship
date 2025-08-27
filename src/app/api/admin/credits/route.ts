import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated admin user
async function getAuthenticatedAdminUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: { clients: true }
    });
    
    // Check if user is admin or master admin
    if (user && (user.role === 'admin' || user.role === 'master_admin')) {
      return user;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// GET /api/admin/credits - Get all clients with their credit balances
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 [API_ADMIN_CREDITS_GET] Fetching all clients with credits for admin:', user.email);

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
      { error: 'Failed to fetch clients with credits' },
      { status: 500 }
    );
  }
}
