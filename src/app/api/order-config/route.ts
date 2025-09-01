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

    console.log(`📊 [API_ORDER_CONFIG_GET] Fetching order config for user: ${user.email} (${user.role})`);
    console.log(`📊 [API_ORDER_CONFIG_GET] Fetching order config for client: ${user.client.companyName || user.client.id} (ID: ${user.clientId})`);

    // Get order configuration for the current client
    let orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: user.clientId }
    });

    // If no order config exists, create a default one
    if (!orderConfig) {
      console.log(`📝 [API_ORDER_CONFIG_GET] No order config found, creating default for client ${user.client.companyName || user.client.id}`);
      
      orderConfig = await prisma.client_order_configs.create({
        data: {
          id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: user.clientId,
          // Default values
          defaultProductDescription: 'ARTIFICAL JEWELLERY',
          defaultPackageValue: 5000,
          defaultWeight: 100,
          defaultTotalItems: 1,
          
          // COD settings
          codEnabledByDefault: false,
          defaultCodAmount: null,
          
          // Validation rules
          minPackageValue: 100,
          maxPackageValue: 100000,
          minWeight: 1,
          maxWeight: 50000,
          minTotalItems: 1,
          maxTotalItems: 100,
          
          // Field requirements
          requireProductDescription: true,
          requirePackageValue: true,
          requireWeight: true,
          requireTotalItems: true,
          
          // Reseller settings
          enableResellerFallback: true
        }
      });
    }

    console.log(`✅ [API_ORDER_CONFIG_GET] Order config retrieved for client ${user.client.companyName || user.client.id}:`, {
      defaultProductDescription: orderConfig.defaultProductDescription,
      defaultPackageValue: orderConfig.defaultPackageValue,
      defaultWeight: orderConfig.defaultWeight,
      defaultTotalItems: orderConfig.defaultTotalItems,
      codEnabledByDefault: orderConfig.codEnabledByDefault
    });

    const response = NextResponse.json({
      orderConfig: {
        // Default values
        defaultProductDescription: orderConfig.defaultProductDescription,
        defaultPackageValue: orderConfig.defaultPackageValue,
        defaultWeight: orderConfig.defaultWeight,
        defaultTotalItems: orderConfig.defaultTotalItems,
        
        // COD settings
        codEnabledByDefault: orderConfig.codEnabledByDefault,
        defaultCodAmount: orderConfig.defaultCodAmount,
        
        // Validation rules
        minPackageValue: orderConfig.minPackageValue,
        maxPackageValue: orderConfig.maxPackageValue,
        minWeight: orderConfig.minWeight,
        maxWeight: orderConfig.maxWeight,
        minTotalItems: orderConfig.minTotalItems,
        maxTotalItems: orderConfig.maxTotalItems,
        
        // Field requirements
        requireProductDescription: orderConfig.requireProductDescription,
        requirePackageValue: orderConfig.requirePackageValue,
        requireWeight: orderConfig.requireWeight,
        requireTotalItems: orderConfig.requireTotalItems,
        
        // Reseller settings
        enableResellerFallback: orderConfig.enableResellerFallback
      },
      clientId: user.clientId,
      clientName: user.client.companyName || user.client.id
    });

    // Apply security headers
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [API_ORDER_CONFIG_GET] Error fetching order config:', error);
    const response = NextResponse.json(
      { error: 'Failed to fetch order configuration' },
      { status: 500 }
    );
    securityHeaders(response);
    return response;
  }
}
