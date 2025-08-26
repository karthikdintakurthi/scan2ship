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
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        client: true
      }
    });

    console.log('🔐 [AUTH] User lookup result:', user ? 'Found' : 'Not found');
    if (user) {
      console.log('🔐 [AUTH] User active:', user.isActive, 'Client active:', user.client?.isActive);
    }

    if (!user || !user.isActive || !user.client.isActive) {
      console.log('🔐 [AUTH] User validation failed:', { 
        userExists: !!user, 
        userActive: user?.isActive, 
        clientActive: user?.client?.isActive 
      });
      return null;
    }

    console.log('🔐 [AUTH] Authentication successful for user:', user.email, 'Client:', user.client.companyName);
    return {
      user: user,
      client: user.client
    };
  } catch (error) {
    console.log('🔐 [AUTH] JWT verification failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUser(request);
    if (!auth || (auth.user.role !== 'admin' && auth.user.role !== 'master_admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
