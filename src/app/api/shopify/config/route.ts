import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import crypto from 'crypto';

// GET /api/shopify/config - Get Shopify configuration for client
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

    const auth = { user: authResult.user!, client: authResult.user!.client };
    const { client } = auth;

    console.log('🔧 [SHOPIFY_CONFIG_GET] Getting Shopify config for client:', client.id);

    // Get Shopify integration
    const integration = await prisma.shopify_integrations.findFirst({
      where: {
        clientId: client.id,
        isActive: true
      }
    });

    // Get auto-creation config
    const autoCreateConfig = await prisma.client_config.findUnique({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'shopify_auto_create_orders'
        }
      }
    });

    // Get webhook config
    const webhookConfig = await prisma.client_config.findUnique({
      where: {
        clientId_key: {
          clientId: client.id,
          key: 'shopify_webhook_secret'
        }
      }
    });

    return NextResponse.json({
      success: true,
      config: {
        integration: integration ? {
          id: integration.id,
          shopDomain: integration.shopDomain,
          syncStatus: integration.syncStatus,
          lastSyncAt: integration.lastSyncAt,
          isActive: integration.isActive
        } : null,
        autoCreateOrders: autoCreateConfig?.value === 'true',
        webhookSecret: webhookConfig?.value ? '***configured***' : null
      }
    });

  } catch (error) {
    console.error('❌ [SHOPIFY_CONFIG_GET] Error getting Shopify config:', error);
    return NextResponse.json(
      { error: 'Failed to get Shopify configuration' },
      { status: 500 }
    );
  }
}

// PUT /api/shopify/config - Update Shopify configuration
export async function PUT(request: NextRequest) {
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

    const auth = { user: authResult.user!, client: authResult.user!.client };
    const { client } = auth;
    const configData = await request.json();

    console.log('🔧 [SHOPIFY_CONFIG_PUT] Updating Shopify config for client:', client.id);

    // Update auto-creation config
    if (typeof configData.autoCreateOrders === 'boolean') {
      await prisma.client_config.upsert({
        where: {
          clientId_key: {
            clientId: client.id,
            key: 'shopify_auto_create_orders'
          }
        },
        update: {
          value: configData.autoCreateOrders.toString(),
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          clientId: client.id,
          key: 'shopify_auto_create_orders',
          value: configData.autoCreateOrders.toString(),
          type: 'boolean',
          category: 'shopify',
          description: 'Automatically create Scan2Ship orders when Shopify orders are created',
          updatedAt: new Date()
        }
      });
    }

    // Update webhook secret
    if (configData.webhookSecret) {
      await prisma.client_config.upsert({
        where: {
          clientId_key: {
            clientId: client.id,
            key: 'shopify_webhook_secret'
          }
        },
        update: {
          value: configData.webhookSecret,
          isEncrypted: true,
          updatedAt: new Date()
        },
        create: {
          id: crypto.randomUUID(),
          clientId: client.id,
          key: 'shopify_webhook_secret',
          value: configData.webhookSecret,
          type: 'string',
          category: 'shopify',
          description: 'Shopify webhook secret for signature validation',
          isEncrypted: true,
          updatedAt: new Date()
        }
      });
    }

    console.log('✅ [SHOPIFY_CONFIG_PUT] Shopify config updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Shopify configuration updated successfully'
    });

  } catch (error) {
    console.error('❌ [SHOPIFY_CONFIG_PUT] Error updating Shopify config:', error);
    return NextResponse.json(
      { error: 'Failed to update Shopify configuration' },
      { status: 500 }
    );
  }
}
