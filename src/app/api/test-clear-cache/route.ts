import { NextRequest, NextResponse } from 'next/server';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
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
      requiredPermissions: [PermissionLevel.ADMIN],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    console.log('🧹 [TEST_CLEAR_CACHE] Clearing courier service cache');
    
    // Clear courier service cache
    const { clearCourierServiceCache } = await import('@/lib/courier-service-config');
    clearCourierServiceCache();
    
    // Clear pickup location cache
    const { clearPickupLocationCache } = await import('@/lib/pickup-location-config');
    clearPickupLocationCache();
    
    console.log('✅ [TEST_CLEAR_CACHE] Cache cleared successfully');
    
    return NextResponse.json({
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ [TEST_CLEAR_CACHE] Error clearing cache:', error);
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    );
  }
}
