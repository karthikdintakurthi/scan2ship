import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { delhiveryService } from '@/lib/delhivery';
import { getCatalogApiKey } from '@/lib/cross-app-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const orderId = parseInt(id)
    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params
    const orderId = parseInt(id)
    
    // Log request headers
    console.log('📋 [API_ORDERS_PUT] Request Headers:');
    console.log('  Content-Type:', request.headers.get('content-type'));
    console.log('  Authorization:', request.headers.get('authorization') ? 'Bearer [REDACTED]' : 'Not provided');
    console.log('  User-Agent:', request.headers.get('user-agent'));
    console.log('  X-Forwarded-For:', request.headers.get('x-forwarded-for'));
    console.log('  X-Real-IP:', request.headers.get('x-real-ip'));
    console.log('  Referer:', request.headers.get('referer'));
    console.log('  Origin:', request.headers.get('origin'));
    console.log('  Accept:', request.headers.get('accept'));
    console.log('  Accept-Language:', request.headers.get('accept-language'));
    console.log('  Accept-Encoding:', request.headers.get('accept-encoding'));
    
    // Log all headers for debugging
    const allHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    console.log('📋 [API_ORDERS_PUT] All Request Headers:', JSON.stringify(allHeaders, null, 2));
    
    const body = await request.json()
    
    // Log the update payload
    console.log('📦 [API_ORDERS_PUT] Update Order Payload:');
    console.log('  Order ID:', orderId);
    console.log('  Payload Size:', JSON.stringify(body).length, 'characters');
    console.log('  Payload Structure:', JSON.stringify(body, null, 2));
    
    // Log individual fields for better debugging
    console.log('🔍 [API_ORDERS_PUT] Payload Fields:');
    Object.entries(body).forEach(([key, value]) => {
      console.log(`  ${key}:`, value);
    });
    
    // Log client information if available
    if (authResult.user?.client) {
      console.log('👤 [API_ORDERS_PUT] Client Information:');
      console.log('  Client ID:', authResult.user.client.id);
      console.log('  User ID:', authResult.user.id);
      console.log('  User Email:', authResult.user.email);
    }
    
    const order = await prisma.orders.update({
      where: { id: orderId },
      data: body
    })

    // Log the updated order
    console.log('✅ [API_ORDERS_PUT] Order Updated Successfully:');
    console.log('  Updated Order ID:', order.id);
    console.log('  Updated Fields:', Object.keys(body).join(', '));
    console.log('  Updated Order Data:', JSON.stringify(order, null, 2));

    return NextResponse.json(order)
  } catch (error) {
    console.error('❌ [API_ORDERS_PUT] Error updating order:', error)
    console.error('❌ [API_ORDERS_PUT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      orderId: (await params).id
    });
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id } = await params
    const orderId = parseInt(id)
    
    // First, fetch the order to check if it's a Delhivery order and get necessary details
    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        courier_service: true,
        tracking_id: true,
        pickup_location: true,
        clientId: true,
        products: true // Include products for inventory restoration
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // If it's a Delhivery order and has a tracking_id (waybill), cancel it in Delhivery first
    let delhiveryCancelResult = null;
    if (order.courier_service?.toLowerCase() === 'delhivery' && order.tracking_id) {
      try {
        console.log('🚫 [API_ORDERS_DELETE] Cancelling Delhivery order before deletion:', order.tracking_id);
        delhiveryCancelResult = await delhiveryService.cancelOrder(
          order.tracking_id,
          order.pickup_location || '',
          order.clientId ? parseInt(order.clientId) : undefined
        );
        
        if (delhiveryCancelResult.success) {
          console.log('✅ [API_ORDERS_DELETE] Delhivery order cancelled successfully');
        } else {
          console.warn('⚠️ [API_ORDERS_DELETE] Failed to cancel Delhivery order:', delhiveryCancelResult.error);
        }
      } catch (delhiveryError) {
        console.error('❌ [API_ORDERS_DELETE] Error cancelling Delhivery order:', delhiveryError);
        // Continue with deletion even if Delhivery cancellation fails
      }
    }

    // Restore inventory if order has products from catalog app
    let inventoryRestoreResult = null;
    if (order.products) {
      try {
        const products = JSON.parse(order.products);
        if (Array.isArray(products) && products.length > 0) {
          console.log(`🔄 [API_ORDERS_DELETE] Restoring inventory for order ${order.id} with ${products.length} products`);
          
          // Fetch complete client data for inventory operations
          let fullClient = client;
          try {
            fullClient = await prisma.clients.findUnique({
              where: { id: client.id },
              select: {
                id: true,
                name: true,
                slug: true,
                companyName: true,
                isActive: true,
                subscriptionStatus: true,
                subscriptionExpiresAt: true
              }
            });
            console.log('🔍 [API_ORDERS_DELETE] Full client data:', fullClient);
          } catch (error) {
            console.error('Error fetching full client data:', error);
            // Fallback to original client data
            fullClient = client;
          }
          
          // Get catalog auth for this client
          const catalogAuth = await getCatalogApiKey(fullClient.id);
          if (catalogAuth) {
            // Prepare inventory restoration data
            const inventoryItems = products.map((item: any) => ({
              sku: item.product?.sku || item.sku,
              quantity: item.quantity || 1
            })).filter(item => item.sku); // Only include items with valid SKUs

            if (inventoryItems.length > 0) {
              // Call catalog app to restore inventory
              const catalogUrl = process.env.CATALOG_APP_URL || 'http://localhost:3000';
              let clientSlug = fullClient.slug;
              if (!clientSlug) {
                // Generate slug from company name or name
                const baseName = fullClient.companyName || fullClient.name || 'default-client';
                clientSlug = baseName.toLowerCase()
                  .replace(/\s+/g, '-')
                  .replace(/[^a-z0-9-]/g, '')
                  .replace(/-+/g, '-')
                  .replace(/^-|-$/g, '');
              }
              
              console.log('🔍 [API_ORDERS_DELETE] Generated client slug:', clientSlug);
              
              if (clientSlug) {
                const restoreResponse = await fetch(`${catalogUrl}/api/public/inventory/restore?client=${clientSlug}`, {
                  method: 'POST',
                  headers: {
                    'X-API-Key': catalogAuth.catalogApiKey,
                    'X-Client-ID': catalogAuth.catalogClientId,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    orderId: `scan2ship_order_${order.id}`,
                    items: inventoryItems,
                    reason: 'order_deletion',
                    webhookId: null
                  }),
                });

                if (restoreResponse.ok) {
                  const restoreData = await restoreResponse.json();
                  console.log(`✅ [API_ORDERS_DELETE] Successfully restored inventory for order ${order.id}:`, restoreData.data.summary);
                  inventoryRestoreResult = {
                    success: true,
                    restoredItems: restoreData.data.summary.totalRestored
                  };
                } else {
                  const errorData = await restoreResponse.json();
                  console.error(`❌ [API_ORDERS_DELETE] Failed to restore inventory for order ${order.id}:`, errorData);
                  inventoryRestoreResult = {
                    success: false,
                    error: errorData.error
                  };
                }
              } else {
                console.warn(`⚠️ [API_ORDERS_DELETE] No client slug available for inventory restoration for order ${order.id}`);
              }
            } else {
              console.log(`ℹ️ [API_ORDERS_DELETE] No valid SKUs found for inventory restoration in order ${order.id}`);
            }
          } else {
            console.log(`ℹ️ [API_ORDERS_DELETE] No catalog auth found for client ${client.id}, skipping inventory restoration for order ${order.id}`);
          }
        }
      } catch (parseError) {
        console.error(`❌ [API_ORDERS_DELETE] Error parsing products for order ${order.id}:`, parseError);
      }
    }

    // Delete the order from database
    await prisma.orders.delete({
      where: { id: orderId }
    });

    console.log(`✅ [API_ORDERS_DELETE] Order ${orderId} deleted successfully`);

    return NextResponse.json({ 
      message: 'Order deleted successfully',
      delhiveryCancellation: delhiveryCancelResult ? {
        success: delhiveryCancelResult.success,
        message: delhiveryCancelResult.message || delhiveryCancelResult.error
      } : null,
      inventoryRestoration: inventoryRestoreResult
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}
