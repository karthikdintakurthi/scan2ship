import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated admin user
async function getAuthenticatedAdminUser(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [AUTH_DEBUG] Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH_DEBUG] Invalid or missing Authorization header');
      return null;
    }

    const token = authHeader.substring(7);
    console.log('🔐 [AUTH_DEBUG] Token length:', token.length);
    
    if (!process.env.JWT_SECRET) {
      console.error('❌ [AUTH_DEBUG] JWT_SECRET environment variable is not set');
      return null;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
      console.log('🔐 [AUTH_DEBUG] JWT decoded successfully, userId:', decoded.userId);
      
      const user = await prisma.users.findUnique({
        where: { id: decoded.userId },
        include: { clients: true }
      });
      
      console.log('🔐 [AUTH_DEBUG] User found:', user ? 'Yes' : 'No');
      if (user) {
        console.log('🔐 [AUTH_DEBUG] User role:', user.role);
        console.log('🔐 [AUTH_DEBUG] User email:', user.email);
      }
      
      // Check if user is admin or master admin
      if (user && (user.role === 'admin' || user.role === 'master_admin')) {
        console.log('✅ [AUTH_DEBUG] User authenticated as admin/master_admin');
        return user;
      } else {
        console.log('❌ [AUTH_DEBUG] User role not authorized:', user?.role);
        return null;
      }
    } catch (jwtError) {
      console.error('❌ [AUTH_DEBUG] JWT verification failed:', jwtError);
      return null;
    }
  } catch (error) {
    console.error('❌ [AUTH_DEBUG] Authentication function error:', error);
    return null;
  }
}

// GET /api/admin/credits - Get all clients with their credit balances
export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API_ADMIN_CREDITS_GET] Request received');
    console.log('📊 [API_ADMIN_CREDITS_GET] Request headers:', Object.fromEntries(request.headers.entries()));
    
    const user = await getAuthenticatedAdminUser(request);
    if (!user) {
      console.log('❌ [API_ADMIN_CREDITS_GET] Authentication failed');
      return NextResponse.json({ 
        error: 'Unauthorized - Authentication failed',
        details: 'Please check your login credentials and try again'
      }, { status: 401 });
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
      { 
        error: 'Failed to fetch clients with credits',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
