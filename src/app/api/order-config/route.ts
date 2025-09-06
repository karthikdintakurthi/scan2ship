import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    // Get user and client data from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    console.log(`📊 [API_ORDER_CONFIG_GET] Fetching order config for user: ${user.email} (${user.role})`);

    return { user, client: user.clients };
  } catch (error) {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      console.log('❌ [API_ORDER_CONFIG_GET] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, client } = auth;

    console.log(`📊 [API_ORDER_CONFIG_GET] Fetching order config for client: ${client.companyName} (ID: ${client.id})`);

    // Get order configuration for the current client
    let orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

    // If no order config exists, create a default one
    if (!orderConfig) {
      console.log(`📝 [API_ORDER_CONFIG_GET] No order config found, creating default for client ${client.companyName}`);
      
      orderConfig = await prisma.client_order_configs.create({
        data: {
          id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          clientId: client.id,
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
          enableResellerFallback: true,
          
          // Thermal print settings
          enableThermalPrint: false,
          
          // Reference prefix settings
          enableReferencePrefix: true,

        }
      });
    }

    console.log(`✅ [API_ORDER_CONFIG_GET] Order config retrieved for client ${client.companyName}:`, {
      defaultProductDescription: orderConfig.defaultProductDescription,
      defaultPackageValue: orderConfig.defaultPackageValue,
      defaultWeight: orderConfig.defaultWeight,
      defaultTotalItems: orderConfig.defaultTotalItems,
      codEnabledByDefault: orderConfig.codEnabledByDefault
    });

    return NextResponse.json({
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
        enableResellerFallback: orderConfig.enableResellerFallback,
        
        // Thermal print settings
        enableThermalPrint: orderConfig.enableThermalPrint,
        
        // Reference prefix settings
        enableReferencePrefix: orderConfig.enableReferencePrefix,

      },
      clientId: client.id,
      clientName: client.companyName
    });

  } catch (error) {
    console.error('❌ [API_ORDER_CONFIG_GET] Error fetching order config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch order configuration' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      console.log('❌ [API_ORDER_CONFIG_PUT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, client } = auth;
    const body = await request.json();
    
    console.log(`📝 [API_ORDER_CONFIG_PUT] Updating order config for client: ${client.companyName}`, body);

    // Check if this is a partial update (just specific settings) or full update
    if ((body.hasOwnProperty('enableResellerFallback') && Object.keys(body).length === 1) ||
        (body.hasOwnProperty('enableThermalPrint') && Object.keys(body).length === 1) ||
        (body.hasOwnProperty('enableReferencePrefix') && Object.keys(body).length === 1)) {
              // Partial update - just update the specific setting
        const updateData: any = {};
        
        if (body.hasOwnProperty('enableResellerFallback')) {
          updateData.enableResellerFallback = body.enableResellerFallback;
          console.log(`📝 [API_ORDER_CONFIG_PUT] Partial update - reseller fallback: ${body.enableResellerFallback}`);
        }
        
        if (body.hasOwnProperty('enableThermalPrint')) {
          updateData.enableThermalPrint = body.enableThermalPrint;
          console.log(`📝 [API_ORDER_CONFIG_PUT] Partial update - thermal print: ${body.enableThermalPrint}`);
        }
        
        if (body.hasOwnProperty('enableReferencePrefix')) {
          updateData.enableReferencePrefix = body.enableReferencePrefix;
          console.log(`📝 [API_ORDER_CONFIG_PUT] Partial update - reference prefix: ${body.enableReferencePrefix}`);
        }
        

      
      const updatedConfig = await prisma.client_order_configs.update({
        where: { clientId: client.id },
        data: updateData
      });

      let settingName = 'unknown';
      let settingValue = 'unknown';
      
      if (body.hasOwnProperty('enableResellerFallback')) {
        settingName = 'reseller fallback';
        settingValue = body.enableResellerFallback;
      } else if (body.hasOwnProperty('enableThermalPrint')) {
        settingName = 'thermal print';
        settingValue = body.enableThermalPrint;
      } else if (body.hasOwnProperty('enableReferencePrefix')) {
        settingName = 'reference prefix';
        settingValue = body.enableReferencePrefix;

      }
      
      console.log(`✅ [API_ORDER_CONFIG_PUT] ${settingName} updated for client ${client.companyName}: ${settingValue}`);

      return NextResponse.json({
        success: true,
        message: `${settingName} setting updated successfully`,
        orderConfig: updatedConfig
      });
    }

    // Full update - handle the complete orderConfig object
    const { orderConfig } = body;

    if (!orderConfig) {
      return NextResponse.json({ error: 'Order config is required' }, { status: 400 });
    }

    console.log(`📝 [API_ORDER_CONFIG_PUT] Full update for client: ${client.companyName}`);

    // Update or create order configuration
    const updatedConfig = await prisma.client_order_configs.upsert({
      where: { clientId: client.id },
      update: {
        defaultProductDescription: orderConfig.defaultProductDescription,
        defaultPackageValue: orderConfig.defaultPackageValue,
        defaultWeight: orderConfig.defaultWeight,
        defaultTotalItems: orderConfig.defaultTotalItems,
        codEnabledByDefault: orderConfig.codEnabledByDefault,
        defaultCodAmount: orderConfig.defaultCodAmount,
        minPackageValue: orderConfig.minPackageValue,
        maxPackageValue: orderConfig.maxPackageValue,
        minWeight: orderConfig.minWeight,
        maxWeight: orderConfig.maxWeight,
        minTotalItems: orderConfig.minTotalItems,
        maxTotalItems: orderConfig.maxTotalItems,
        requireProductDescription: orderConfig.requireProductDescription,
        requirePackageValue: orderConfig.requirePackageValue,
        requireWeight: orderConfig.requireWeight,
        requireTotalItems: orderConfig.requireTotalItems,
        enableResellerFallback: orderConfig.enableResellerFallback,
        enableThermalPrint: orderConfig.enableThermalPrint,
        enableReferencePrefix: orderConfig.enableReferencePrefix,

      },
      create: {
        id: `order-config-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        clientId: client.id,
        defaultProductDescription: orderConfig.defaultProductDescription,
        defaultPackageValue: orderConfig.defaultPackageValue,
        defaultWeight: orderConfig.defaultWeight,
        defaultTotalItems: orderConfig.defaultTotalItems,
        codEnabledByDefault: orderConfig.codEnabledByDefault,
        defaultCodAmount: orderConfig.defaultCodAmount,
        minPackageValue: orderConfig.minPackageValue,
        maxPackageValue: orderConfig.maxPackageValue,
        minWeight: orderConfig.minWeight,
        maxWeight: orderConfig.maxWeight,
        minTotalItems: orderConfig.minTotalItems,
        maxTotalItems: orderConfig.maxTotalItems,
        requireProductDescription: orderConfig.requireProductDescription,
        requirePackageValue: orderConfig.requirePackageValue,
        requireWeight: orderConfig.requireWeight,
        requireTotalItems: orderConfig.requireTotalItems,
        enableResellerFallback: orderConfig.enableResellerFallback,
        enableThermalPrint: orderConfig.enableThermalPrint,
        enableReferencePrefix: orderConfig.enableReferencePrefix,

      }
    });

    console.log(`✅ [API_ORDER_CONFIG_PUT] Order config updated for client ${client.companyName}`);

    return NextResponse.json({
      success: true,
      message: 'Order configuration updated successfully',
      orderConfig: updatedConfig
    });

  } catch (error) {
    console.error('❌ [API_ORDER_CONFIG_PUT] Error updating order config:', error);
    return NextResponse.json(
      { error: 'Failed to update order configuration' },
      { status: 500 }
    );
  }
}
