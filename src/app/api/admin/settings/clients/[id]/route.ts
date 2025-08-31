import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated admin user
async function getAuthenticatedAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  console.log('🔍 [ADMIN_AUTH] Auth header:', authHeader ? 'Present' : 'Missing');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ [ADMIN_AUTH] Invalid auth header format');
    return null;
  }

  const token = authHeader.substring(7);
  console.log('🔍 [ADMIN_AUTH] Token length:', token.length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    console.log('🔍 [ADMIN_AUTH] JWT decoded successfully, userId:', decoded.userId);
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId }
    });

    console.log('🔍 [ADMIN_AUTH] User found:', user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    } : 'null');

    if (!user) {
      console.log('❌ [ADMIN_AUTH] User not found');
      return null;
    }

    if (!user.isActive) {
      console.log('❌ [ADMIN_AUTH] User is not active');
      return null;
    }

    if (user.role !== 'admin' && user.role !== 'master_admin') {
      console.log('❌ [ADMIN_AUTH] User is not admin or master_admin, role:', user.role);
      return null;
    }

    console.log('✅ [ADMIN_AUTH] Admin authentication successful');
    return {
      user: user
    };
  } catch (error) {
    console.error('❌ [ADMIN_AUTH] JWT verification failed:', error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🚀 [API_ADMIN_CLIENT_CONFIG_GET] Starting request...');
    
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      console.log('❌ [API_ADMIN_CLIENT_CONFIG_GET] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;
    console.log(`📊 [API_ADMIN_CLIENT_CONFIG_GET] Fetching client configuration for client ${clientId}`);

    // Get client with all related data
    let client;
    try {
      client = await prisma.clients.findUnique({
        where: { id: clientId },
        include: {
          pickup_locations: true,
          courier_services: true,
          client_order_configs: true,
          client_config: true,
          _count: {
            select: {
              users: true,
              orders: true
            }
          }
        }
      });
    } catch (dbError) {
      console.error('❌ [API_ADMIN_CLIENT_CONFIG_GET] Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    if (!client) {
      console.log(`❌ [API_ADMIN_CLIENT_CONFIG_GET] Client not found: ${clientId}`);
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    console.log(`✅ [API_ADMIN_CLIENT_CONFIG_GET] Client found: ${client.companyName}`);
    console.log(`📊 [API_ADMIN_CLIENT_CONFIG_GET] Client data:`, {
      pickupLocations: client.pickup_locations.length,
      courierServices: client.courier_services.length,
      clientConfigs: client.client_config.length,
      hasOrderConfig: !!client.client_order_configs
    });
    


    // Process client configurations and decrypt sensitive data
    let processedConfigs: Array<{
      id: string;
      key: string;
      value: string;
      displayValue: string;
      type: string;
      category: string;
      description: string | null;
      isEncrypted: boolean;
    }>;
    try {
      processedConfigs = client.client_config.map(config => {
        let displayValue = config.value;
        
        if (config.isEncrypted && config.value) {
          if (config.type === 'password') {
            displayValue = '••••••••••••••••';
          } else {
            displayValue = '***ENCRYPTED***';
          }
        }
        
        return {
          id: config.id,
          key: config.key,
          value: config.value,
          displayValue: displayValue,
          type: config.type,
          category: config.category,
          description: config.description,
          isEncrypted: config.isEncrypted
        };
      });
    } catch (configError) {
      console.error('❌ [API_ADMIN_CLIENT_CONFIG_GET] Error processing configs:', configError);
      processedConfigs = [];
    }

    // Group configurations by category
    let configByCategory;
    try {
      configByCategory = processedConfigs.reduce((acc, config) => {
        if (!acc[config.category]) {
          acc[config.category] = [];
        }
        acc[config.category].push(config);
        return acc;
      }, {} as Record<string, any[]>);
    } catch (categoryError) {
      console.error('❌ [API_ADMIN_CLIENT_CONFIG_GET] Error grouping configs:', categoryError);
      configByCategory = {};
    }


    
    // Build response object
    let responseData;
    try {
      responseData = {
        client: {
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
          isActive: client.isActive,
          _count: client._count
        },
        pickupLocations: client.pickup_locations.map(location => ({
          id: location.id,
          name: location.label,
          value: location.value,
          delhiveryApiKey: location.delhiveryApiKey || null, // Return actual API key, not masked
          isActive: true
        })),
        courierServices: client.courier_services.map(service => ({
          id: service.id,
          name: service.name,
          code: service.code,
          isActive: service.isActive,
          isDefault: service.isDefault
        })),
        clientOrderConfig: client.client_order_configs ? {
          id: client.client_order_configs.id,
          
          // Default values
          defaultProductDescription: client.client_order_configs.defaultProductDescription,
          defaultPackageValue: client.client_order_configs.defaultPackageValue,
          defaultWeight: client.client_order_configs.defaultWeight,
          defaultTotalItems: client.client_order_configs.defaultTotalItems,
          
          // COD settings
          codEnabledByDefault: client.client_order_configs.codEnabledByDefault,
          defaultCodAmount: client.client_order_configs.defaultCodAmount,
          
          // Validation rules
          minPackageValue: client.client_order_configs.minPackageValue,
          maxPackageValue: client.client_order_configs.maxPackageValue,
          minWeight: client.client_order_configs.minWeight,
          maxWeight: client.client_order_configs.maxWeight,
          minTotalItems: client.client_order_configs.minTotalItems,
          maxTotalItems: client.client_order_configs.maxTotalItems,
          
          // Field requirements
          requireProductDescription: client.client_order_configs.requireProductDescription,
          requirePackageValue: client.client_order_configs.requirePackageValue,
          requireWeight: client.client_order_configs.requireWeight,
          requireTotalItems: client.client_order_configs.requireTotalItems,
          
          // Reseller settings
          enableResellerFallback: client.client_order_configs.enableResellerFallback
        } : null,

        orderConfig: {
          autoAssignTracking: configByCategory.order?.find(c => c.key === 'AUTO_ASSIGN_TRACKING')?.value === 'true' || false,
          requireTrackingNumber: configByCategory.order?.find(c => c.key === 'REQUIRE_TRACKING')?.value === 'true' || false,
          defaultCourierService: configByCategory.order?.find(c => c.key === 'DEFAULT_COURIER')?.value || ''
        },
        configs: processedConfigs.filter(config => config.category !== 'pickup'),
        configByCategory: Object.fromEntries(
          Object.entries(configByCategory).filter(([category]) => category !== 'pickup')
        )
      };
    } catch (responseError) {
      console.error('❌ [API_ADMIN_CLIENT_CONFIG_GET] Error building response:', responseError);
      return NextResponse.json({ error: 'Error building response' }, { status: 500 });
    }

    console.log(`✅ [API_ADMIN_CLIENT_CONFIG_GET] Client configuration retrieved for client ${clientId}`);
    console.log(`📊 [API_ADMIN_CLIENT_CONFIG_GET] Response data structure:`, {
      hasClient: !!responseData.client,
      hasPickupLocations: !!responseData.pickupLocations,
      hasCourierServices: !!responseData.courierServices,
      hasClientOrderConfig: !!responseData.clientOrderConfig,

      hasOrderConfig: !!responseData.orderConfig,
      configsCount: responseData.configs.length
    });

    return NextResponse.json({
      config: responseData
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_CONFIG_GET] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate admin user
    const auth = await getAuthenticatedAdmin(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: clientId } = await params;
    const updateData = await request.json();

    console.log(`📝 [API_ADMIN_CLIENT_CONFIG_PUT] Updating client configuration for client ${clientId}`);

    // Update client basic information
    if (updateData.client) {
      await prisma.clients.update({
        where: { id: clientId },
        data: {
          name: updateData.client.name,
          companyName: updateData.client.companyName,
          email: updateData.client.email,
          phone: updateData.client.phone,
          address: updateData.client.address,
          city: updateData.client.city,
          state: updateData.client.state,
          country: updateData.client.country,
          pincode: updateData.client.pincode,
          isActive: updateData.client.isActive,
          updatedAt: new Date()
        }
      });
    }

    // Update client configurations
    if (updateData.configs) {
      const updatePromises = updateData.configs.map(async (config: any) => {
        let valueToStore = config.value;
        
        // Don't encrypt any keys - store as plain text
        // if (config.isEncrypted && config.value && !config.value.startsWith('••••••••••••••••')) {
        //   valueToStore = encrypt(config.value);
        // }
        
        return prisma.client_config.upsert({
          where: {
            clientId_key: {
              clientId,
              key: config.key
            }
          },
          update: {
            value: valueToStore,
            isEncrypted: false, // Don't encrypt any keys
            updatedAt: new Date()
          },
          create: {
            id: `config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            clientId,
            key: config.key,
            value: valueToStore,
            type: config.type,
            category: config.category,
            description: config.description,
            isEncrypted: false, // Don't encrypt any keys
            updatedAt: new Date()
          }
        });
      });

      await Promise.all(updatePromises);
    }

    // Update pickup locations
    if (updateData.pickupLocations) {
      // First, delete existing pickup locations
      await prisma.pickup_locations.deleteMany({
        where: { clientId }
      });

      // Then create new ones
      if (updateData.pickupLocations.length > 0) {
        console.log(`📝 [API_ADMIN_CLIENT_CONFIG_PUT] Processing pickup locations:`, {
          count: updateData.pickupLocations.length
        });

        try {
          await prisma.pickup_locations.createMany({
            data: updateData.pickupLocations.map((location: any) => ({
              id: `pickup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId,
              value: location.value,
              label: location.name,
              delhiveryApiKey: location.delhiveryApiKey && !location.delhiveryApiKey.startsWith('••••••••••••••••') 
                ? location.delhiveryApiKey  // Don't encrypt - store as plain text
                : location.delhiveryApiKey
            }))
          });
          console.log(`✅ [API_ADMIN_CLIENT_CONFIG_PUT] Successfully created ${updateData.pickupLocations.length} pickup locations`);
        } catch (createError) {
          console.error('❌ [API_ADMIN_CLIENT_CONFIG_PUT] Error creating pickup locations:', createError);
          throw new Error(`Failed to create pickup locations: ${createError}`);
        }
      }

      // Clear pickup location cache for all clients since we can't target specific client cache
      console.log('🧹 [API_ADMIN_CLIENT_CONFIG_PUT] Clearing pickup location cache after update');
      try {
        // Import and clear cache
        const { clearPickupLocationCache } = await import('@/lib/pickup-location-config');
        clearPickupLocationCache();
        console.log('✅ [API_ADMIN_CLIENT_CONFIG_PUT] Pickup location cache cleared');
      } catch (error) {
        console.warn('⚠️ [API_ADMIN_CLIENT_CONFIG_PUT] Could not clear pickup location cache:', error);
      }
    }

    // Update courier services
    if (updateData.courierServices) {
      // First, delete existing courier services
      await prisma.courier_services.deleteMany({
        where: { clientId }
      });

      // Then create new ones
      if (updateData.courierServices.length > 0) {
        console.log(`📝 [API_ADMIN_CLIENT_CONFIG_PUT] Processing courier services:`, {
          count: updateData.courierServices.length
        });

        try {
          await prisma.courier_services.createMany({
            data: updateData.courierServices.map((service: any) => ({
              id: `courier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              clientId,
              code: service.code,
              name: service.name,
              isActive: service.isActive,
              isDefault: service.isDefault
            }))
          });
          console.log(`✅ [API_ADMIN_CLIENT_CONFIG_PUT] Successfully created ${updateData.courierServices.length} courier services`);
        } catch (createError) {
          console.error('❌ [API_ADMIN_CLIENT_CONFIG_PUT] Error creating courier services:', createError);
          throw new Error(`Failed to create courier services: ${createError}`);
        }
      }

      // Clear courier service cache for all clients since we can't target specific client cache
      console.log('🧹 [API_ADMIN_CLIENT_CONFIG_PUT] Clearing courier service cache after update');
      try {
        // Import and clear cache
        const { clearCourierServiceCache } = await import('@/lib/courier-service-config');
        clearCourierServiceCache();
        console.log('✅ [API_ADMIN_CLIENT_CONFIG_PUT] Courier service cache cleared');
      } catch (error) {
        console.warn('⚠️ [API_ADMIN_CLIENT_CONFIG_PUT] Could not clear courier service cache:', error);
      }
    }

    // Update client order configuration
    if (updateData.clientOrderConfig) {
      console.log('📝 [API_ADMIN_CLIENT_CONFIG_PUT] Updating client order configuration');
      
      await prisma.client_order_configs.upsert({
        where: { clientId },
        update: {
          // Default values
          defaultProductDescription: updateData.clientOrderConfig.defaultProductDescription,
          defaultPackageValue: updateData.clientOrderConfig.defaultPackageValue,
          defaultWeight: updateData.clientOrderConfig.defaultWeight,
          defaultTotalItems: updateData.clientOrderConfig.defaultTotalItems,
          
          // COD settings
          codEnabledByDefault: updateData.clientOrderConfig.codEnabledByDefault,
          defaultCodAmount: updateData.clientOrderConfig.defaultCodAmount,
          
          // Validation rules
          minPackageValue: updateData.clientOrderConfig.minPackageValue,
          maxPackageValue: updateData.clientOrderConfig.maxPackageValue,
          minWeight: updateData.clientOrderConfig.minWeight,
          maxWeight: updateData.clientOrderConfig.maxWeight,
          minTotalItems: updateData.clientOrderConfig.minTotalItems,
          maxTotalItems: updateData.clientOrderConfig.maxTotalItems,
          
          // Field requirements
          requireProductDescription: updateData.clientOrderConfig.requireProductDescription,
          requirePackageValue: updateData.clientOrderConfig.requirePackageValue,
          requireWeight: updateData.clientOrderConfig.requireWeight,
          requireTotalItems: updateData.clientOrderConfig.requireTotalItems,
          
          // Reseller settings
          enableResellerFallback: updateData.clientOrderConfig.enableResellerFallback
        },
        create: {
          id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId,
          // Default values
          defaultProductDescription: updateData.clientOrderConfig.defaultProductDescription,
          defaultPackageValue: updateData.clientOrderConfig.defaultPackageValue,
          defaultWeight: updateData.clientOrderConfig.defaultWeight,
          defaultTotalItems: updateData.clientOrderConfig.defaultTotalItems,
          
          // COD settings
          codEnabledByDefault: updateData.clientOrderConfig.codEnabledByDefault,
          defaultCodAmount: updateData.clientOrderConfig.defaultCodAmount,
          
          // Validation rules
          minPackageValue: updateData.clientOrderConfig.minPackageValue,
          maxPackageValue: updateData.clientOrderConfig.maxPackageValue,
          minWeight: updateData.clientOrderConfig.minWeight,
          maxWeight: updateData.clientOrderConfig.maxWeight,
          minTotalItems: updateData.clientOrderConfig.minTotalItems,
          maxTotalItems: updateData.clientOrderConfig.maxTotalItems,
          
          // Field requirements
          requireProductDescription: updateData.clientOrderConfig.requireProductDescription,
          requirePackageValue: updateData.clientOrderConfig.requirePackageValue,
          requireWeight: updateData.clientOrderConfig.requireWeight,
          requireTotalItems: updateData.clientOrderConfig.requireTotalItems,
          
          // Reseller settings
          enableResellerFallback: updateData.clientOrderConfig.enableResellerFallback
        }
      });

      // Clear order config cache
      console.log('🧹 [API_ADMIN_CLIENT_CONFIG_PUT] Clearing order config cache after update');
      try {
        // Import and clear cache
        const { clearOrderConfigCache } = await import('@/lib/order-config');
        clearOrderConfigCache();
        console.log('✅ [API_ADMIN_CLIENT_CONFIG_PUT] Order config cache cleared');
      } catch (error) {
        console.warn('⚠️ [API_ADMIN_CLIENT_CONFIG_PUT] Could not clear order config cache:', error);
      }
    }

    console.log(`✅ [API_ADMIN_CLIENT_CONFIG_PUT] Client configuration updated for client ${clientId}`);

    return NextResponse.json({
      message: 'Client configuration updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_ADMIN_CLIENT_CONFIG_PUT] Error updating client config:', error);
    return NextResponse.json(
      { error: 'Failed to update client configuration' },
      { status: 500 }
    );
  }
}
