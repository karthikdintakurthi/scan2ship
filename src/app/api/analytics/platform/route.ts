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
    const decoded = jwt.verify(token, enhancedJwtConfig.getSecret()) as any;
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

    // Check if user has access to platform analytics
    if (user.role !== 'admin' && user.role !== 'master_admin') {
      return null;
    }

    console.log(`🔐 [AUTH] Authentication successful for user: ${user.email} (${user.role})`);
    return { user };

  } catch (error) {
    console.log('🔐 [AUTH] JWT verification failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log(`📊 [API_ANALYTICS_PLATFORM_GET] Fetching platform analytics for user: ${auth.user.email} (${auth.user.role})`);

    // Get platform analytics
    const analytics = await AnalyticsService.getPlatformAnalytics();

    return NextResponse.json({
      success: true,
      analytics
    });

  } catch (error) {
    console.error('❌ [API_ANALYTICS_PLATFORM] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch platform analytics' },
      { status: 500 }
    );
  }
}
