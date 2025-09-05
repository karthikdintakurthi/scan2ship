import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import AnalyticsService from '@/lib/analytics-service';

// Helper function to get authenticated user and client
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('🔐 [AUTH] No authorization header or invalid format');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('🔐 [AUTH] Token extracted, length:', token.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    console.log('🔐 [AUTH] JWT decoded successfully, userId:', decoded.userId);
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive) {
      return null;
    }

    console.log(`🔐 [AUTH] Authentication successful for user: ${user.email} (${user.role})`);
    return { user };
  } catch (error) {
    console.log('🔐 [AUTH] JWT verification failed:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = params.id;

    // Check if user has access to this client's analytics
    // Admin and master_admin can access any client's analytics
    // Regular users can only access their own client's analytics
    if (auth.user.role !== 'admin' && auth.user.role !== 'master_admin') {
      if (auth.user.clientId !== clientId) {
        return NextResponse.json({ error: 'Forbidden - Access denied to this client\'s analytics' }, { status: 403 });
      }
    }

    console.log(`📊 [API_ANALYTICS_CLIENT] Fetching analytics for client: ${clientId} by user: ${auth.user.email} (${auth.user.role})`);

    // Get client analytics
    const analytics = await AnalyticsService.getClientAnalytics(clientId);

    console.log(`📊 [API_ANALYTICS_CLIENT] Analytics retrieved:`, {
      openaiImageCount: analytics.openaiImageCount,
      openaiAddressCount: analytics.openaiAddressCount,
      createOrderCount: analytics.createOrderCount,
      orderPatterns: analytics.orderPatterns
    });

    return NextResponse.json({
      success: true,
      clientId,
      analytics
    });

  } catch (error) {
    console.error('❌ [API_ANALYTICS_CLIENT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client analytics' },
      { status: 500 }
    );
  }
}
