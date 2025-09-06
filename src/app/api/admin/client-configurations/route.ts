import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

const prisma = new PrismaClient();

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

    console.log('📊 [API_ADMIN_CLIENT_CONFIGS_GET] Fetching all clients with configurations for admin:', auth.user.email);

    // Get all clients with their complete configurations
    const clients = await prisma.clients.findMany({
      include: {
        _count: {
          select: {
            users: true,
            orders: true
          }
        },
        // Include all client configurations
        client_config: {
          orderBy: {
            category: 'asc'
          }
        },
        // Include pickup locations
        pickup_locations: {
          orderBy: {
            label: 'asc'
          }
        },
        // Include courier services
        courier_services: {
          orderBy: {
            name: 'asc'
          }
        },
        // Include order configuration
        client_order_configs: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log(`✅ [API_ADMIN_CLIENT_CONFIGS_GET] Found ${clients.length} clients with configurations`);

    return NextResponse.json({
      clients: clients.map((client: any) => ({
        id: client.id,
        name: client.name,
        companyName: client.companyName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        city: client.city,
        state: client.state,
        country: client.country,
        pincode: client.pincode,
        subscriptionPlan: client.subscriptionPlan,
        subscriptionStatus: client.subscriptionStatus,
        subscriptionExpiresAt: client.subscriptionExpiresAt,
        isActive: client.isActive,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        _count: client._count,
        // Include all configurations
        clientConfigs: client.client_config.map((config: any) => ({
          id: config.id,
          key: config.key,
          value: config.value,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted,
          createdAt: config.createdAt,
          updatedAt: config.updatedAt
        })),
        // Include pickup locations
        pickupLocations: client.pickup_locations.map((location: any) => ({
          id: location.id,
          value: location.value,
          label: location.label,
          delhiveryApiKey: location.delhiveryApiKey
        })),
        // Include courier services
        courierServices: client.courier_services.map((service: any) => ({
          id: service.id,
          code: service.code,
          name: service.name,
          isActive: service.isActive,
          isDefault: service.isDefault
        })),
        // Include order configuration
        clientOrderConfig: client.client_order_configs ? {
          id: client.client_order_configs.id,
          defaultPackageValue: client.client_order_configs.defaultPackageValue,
          defaultProductDescription: client.client_order_configs.defaultProductDescription,
          defaultCodAmount: client.client_order_configs.defaultCodAmount,
          codEnabledByDefault: client.client_order_configs.codEnabledByDefault,
          minPackageValue: client.client_order_configs.minPackageValue,
          maxPackageValue: client.client_order_configs.maxPackageValue,
          minWeight: client.client_order_configs.minWeight,
          maxWeight: client.client_order_configs.maxWeight,
          minTotalItems: client.client_order_configs.minTotalItems,
          maxTotalItems: client.client_order_configs.maxTotalItems,
          requireProductDescription: client.client_order_configs.requireProductDescription,
          requirePackageValue: client.client_order_configs.requirePackageValue,
          requireWeight: client.client_order_configs.requireWeight,
          requireTotalItems: client.client_order_configs.requireTotalItems,
          enableResellerFallback: client.client_order_configs.enableResellerFallback
        } : null
      }))
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_CONFIGS_GET] Error fetching client configurations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client configurations' },
      { status: 500 }
    );
  }
}
