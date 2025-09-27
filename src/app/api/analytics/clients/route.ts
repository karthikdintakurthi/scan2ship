import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import AnalyticsService from '@/lib/analytics-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Authentication handled by centralized middleware

export async function GET(request: NextRequest) {
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

    // Get clients analytics summary
    const clients = await AnalyticsService.getClientsAnalyticsSummary();

    return NextResponse.json({
      success: true,
      clients
    });

  } catch (error) {
    console.error('❌ [API_ANALYTICS_CLIENTS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients analytics' },
      { status: 500 }
    );
  }
}
