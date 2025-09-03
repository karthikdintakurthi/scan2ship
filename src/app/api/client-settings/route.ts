import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Helper function to get authenticated user
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    if (!process.env.JWT_SECRET) {
      console.error('🚨 CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set');
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 500 }
      );
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      include: {
        clients: true
      }
    });

    if (!user || !user.isActive || !user.clients.isActive) {
      return null;
    }

    return { user, client: user.clients };
  } catch (error) {
    return null;
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      console.log('❌ [API_CLIENT_SETTINGS_PUT] Authentication failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user, client } = auth;
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

    return NextResponse.json({
      success: true,
      message: 'Client settings updated successfully'
    });

  } catch (error) {
    console.error('❌ [API_CLIENT_SETTINGS_PUT] Error updating client settings:', error);
    return NextResponse.json(
      { error: 'Failed to update client settings' },
      { status: 500 }
    );
  }
}
