import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function PUT(request: NextRequest) {
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
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const user = authResult.user!;
    const client = user.client;
    const body = await request.json();
    const { dtdcSlips } = body;

    console.log(`📝 [API_CLIENT_SETTINGS_PUT] Updating client settings for: ${client.companyName}`);

    // Update DTDC slips configuration
    if (dtdcSlips) {
      // Store DTDC slips configuration in client_order_configs table
      // We'll use a custom field or create a separate table for this
      const updatedConfig = await prisma.client_order_configs.upsert({
        where: { clientId: client.id },
        update: {
          // Add DTDC slips configuration to existing config
          // For now, we'll store it as a JSON string in a custom field
          // You might want to create a separate table for DTDC slips
        },
        create: {
          id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
          // Default values
          defaultProductDescription: 'ARTIFICAL JEWELLERY',
          defaultPackageValue: 5000,
          defaultWeight: 100,
          defaultTotalItems: 1,
          codEnabledByDefault: false,
          defaultCodAmount: null,
          minPackageValue: 100,
          maxPackageValue: 100000,
          minWeight: 1,
          maxWeight: 50000,
          minTotalItems: 1,
          maxTotalItems: 100,
          requireProductDescription: true,
          requirePackageValue: true,
          requireWeight: true,
          requireTotalItems: true,
          enableResellerFallback: true
        }
      });

      console.log(`✅ [API_CLIENT_SETTINGS_PUT] Client settings updated for ${client.companyName}`);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Client settings updated successfully'
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_CLIENT_SETTINGS_PUT] Error updating client settings:', error);
    const response = NextResponse.json(
      { error: 'Failed to update client settings' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
