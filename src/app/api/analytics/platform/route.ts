import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import AnalyticsService from '@/lib/analytics-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
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

    const auth = { user: authResult.user! };

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
