import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService from '@/lib/analytics-service';
import { getAuthenticatedUserWithRole } from '@/lib/auth-utils';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUserWithRole(request, ['admin', 'master_admin', 'user']);
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
