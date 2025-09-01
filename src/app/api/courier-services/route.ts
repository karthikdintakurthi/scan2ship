import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;

    console.log(`📊 [API_COURIER_SERVICES_GET] Fetching courier services for client: ${user.client.companyName || user.client.id} (ID: ${user.clientId})`);

    // Get courier services for the current client
    const courierServices = await prisma.courier_services.findMany({
      where: { clientId: user.clientId },
      orderBy: { name: 'asc' }
    });

    console.log(`🔍 [API_COURIER_SERVICES_GET] Raw courier services from DB:`, courierServices);

    // Transform courier services to match the expected format
    const formattedServices = courierServices.map(service => ({
      value: service.code,
      label: service.name,
      isActive: service.isActive
    }));

    console.log(`✅ [API_COURIER_SERVICES_GET] Found ${formattedServices.length} courier services for client ${user.client.companyName || user.client.id}`);
    console.log(`📋 [API_COURIER_SERVICES_GET] Formatted services:`, formattedServices);

    const response = NextResponse.json({
      courierServices: formattedServices,
      clientId: user.clientId,
      clientName: user.client.companyName || user.client.id
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_COURIER_SERVICES_GET] Error fetching courier services:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch courier services' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
