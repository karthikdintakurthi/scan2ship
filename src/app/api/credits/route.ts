import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreditService } from '@/lib/credit-service';
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

    // Authorize user with subscription check
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true,
      requireValidSubscription: false  // Temporarily disabled
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    try {
      const credits = await CreditService.getClientCredits(user.clientId);
      
      if (!credits) {
        const response = NextResponse.json({ error: 'No credits found for this client' }, { status: 404 });
        securityHeaders(response);
        return response;
      }

      const response = NextResponse.json({
        success: true,
        data: credits
      });

      // Apply security headers
      securityHeaders(response);
      return response;

    } catch (error) {
      console.error('Error getting credits:', error);
      const response = NextResponse.json({ error: 'Failed to get client credits' }, { status: 500 });
      securityHeaders(response);
      return response;
    }

  } catch (error) {
    console.error('Credits API error:', error);
    const response = NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    securityHeaders(response);
    return response;
  }
}
