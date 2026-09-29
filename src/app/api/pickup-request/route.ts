import { NextRequest, NextResponse } from 'next/server';
import { requestPickups } from '@/lib/application/pickups';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const body = await request.json();

    // Validate required fields
    const requiredFields = ['pickup_date', 'pickup_time', 'expected_package_count'];
    const missingFields = requiredFields.filter(field => !body[field] || (typeof body[field] === 'string' && body[field].trim() === ''));
    if (missingFields.length > 0) {
      const response = NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
      securityHeaders(response);
      return response;
    }

    const outcome = await requestPickups(user, {
      pickupDate: body.pickup_date,
      pickupTime: body.pickup_time,
      expectedPackageCount: body.expected_package_count || 1,
      locations: Array.isArray(body.selectedPickupLocations) ? body.selectedPickupLocations : [],
    });

    let response: NextResponse;
    if (!outcome.ok) {
      response = NextResponse.json(outcome.body, { status: outcome.status });
    } else if (outcome.results.length > 0) {
      response = NextResponse.json({
        success: true,
        message: `Pickup requests submitted successfully for ${outcome.results.length} location(s)`,
        results: outcome.results,
        errors: outcome.errors.length > 0 ? outcome.errors : undefined,
        scheduled_date: body.pickup_date,
        scheduled_time: body.pickup_time
      });
    } else {
      response = NextResponse.json(
        { error: 'Failed to schedule pickup with any location', details: outcome.errors },
        { status: 400 }
      );
    }
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_PICKUP_REQUEST] Error processing pickup request:', error);
    const response = NextResponse.json(
      { error: 'Internal server error while processing pickup request' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
