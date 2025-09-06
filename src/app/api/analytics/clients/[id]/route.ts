import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import AnalyticsService from '@/lib/analytics-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Authentication handled by centralized middleware

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const auth = { user: authResult.user! };

    const clientId = params.id;

    // Get client analytics
    const analytics = await AnalyticsService.getClientAnalytics(clientId);

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
