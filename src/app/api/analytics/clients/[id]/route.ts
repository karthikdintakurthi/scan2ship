import { NextRequest, NextResponse } from 'next/server';
import AnalyticsService from '@/lib/analytics-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Authentication handled by centralized middleware

export async function GET(
  request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;
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
      requiredRole: UserRole.MASTER_ADMIN,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: false // Master admin doesn't need active client
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user! };

    const clientId = params.id;

    // Check if user has access to this client's analytics
    // Master admins can access any client's analytics ('admin' is not a UserRole)
    // Regular users can only access their own client's analytics
    if (auth.user.role !== UserRole.MASTER_ADMIN) {
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
