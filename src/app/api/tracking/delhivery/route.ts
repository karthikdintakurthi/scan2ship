import { NextRequest, NextResponse } from 'next/server';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { getLiveTracking } from '@/lib/application/live-tracking';

/**
 * GET /api/tracking/delhivery?waybill=...
 *
 * Live Delhivery tracking for one of the caller's orders (the website's
 * tracking view). Uses the order's pickup-location Delhivery key.
 */
export async function GET(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });
    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const waybill = request.nextUrl.searchParams.get('waybill') || '';
    const result = await getLiveTracking(authResult.user!, { waybill });

    const response = result.ok
      ? NextResponse.json({ success: true, data: result.tracking })
      : NextResponse.json(
          { error: result.error, ...(result.details ? { details: result.details } : {}) },
          { status: result.status }
        );
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('❌ [API_TRACKING_DELHIVERY] Error:', error instanceof Error ? error.message : String(error));
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
