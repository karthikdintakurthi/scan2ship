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

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { eventType, eventData } = body;

    // Validate event type
    if (!eventType || !['openai_image', 'openai_address', 'create_order'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Track the event
    await AnalyticsService.trackEvent({
      eventType,
      clientId: auth.user.clientId,
      userId: auth.user.id,
      eventData
    });

    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    });

  } catch (error) {
    console.error('❌ [API_ANALYTICS_TRACK] Error:', error);
    return NextResponse.json(
      { error: 'Failed to track event' },
      { status: 500 }
    );
  }
}
