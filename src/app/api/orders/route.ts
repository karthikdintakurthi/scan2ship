import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DelhiveryService } from '@/lib/delhivery';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { getCatalogApiKey } from '@/lib/cross-app-auth';
import { parseOrderId } from '@/lib/application/policy';
import { createOrder } from '@/lib/application/order-creation';

const delhiveryService = new DelhiveryService();

// Authentication handled by centralized middleware

export async function POST(request: NextRequest) {
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

    // Authorize user - allow all roles to create orders
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const orderData = await request.json();

    console.log('📦 [API_ORDERS_POST] Creating order for client ID:', authResult.user!.clientId);
    const result = await createOrder(authResult.user!, orderData);
    if (!result.ok) {
      return NextResponse.json(result.body, { status: result.status });
    }

    const updatedOrder = result.order;
    return NextResponse.json({
      success: true,
      // updatedOrder includes the waybill and booking status saved after the carrier call
      order: {
        id: updatedOrder.id,
        orderNumber: `ORDER-${updatedOrder.id}`,
        referenceNumber: updatedOrder.reference_number,
        trackingId: updatedOrder.tracking_id,
        delhiveryStatus: updatedOrder.delhivery_api_status
      }
    });

  } catch (error) {
    console.error('❌ [API_ORDERS_POST] Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

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

    // Authorize user - allow all roles to read orders
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };

    const { client, user } = auth;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const pickupLocation = searchParams.get('pickupLocation') || '';
    const courierService = searchParams.get('courierService') || '';
    const trackingStatus = searchParams.get('trackingStatus') || '';
    const subGroup = searchParams.get('subGroup') || '';
    
    console.log('🔍 [API_ORDERS_GET] Request parameters:', { page, limit, search, fromDate, toDate, pickupLocation, courierService, trackingStatus, subGroup, clientId: client.id });
    
    const skip = (page - 1) * limit;
    
    // Build where clause with client isolation
    const whereClause: any = {
      clientId: client.id // Ensure client isolation
    };

    // Role-based filtering
    if (user.role === 'child_user') {
      // Get user's sub-group name
      try {
        const userSubGroup = await prisma.user_sub_groups.findFirst({
          where: { userId: user.id },
          select: {
            subGroups: {
              select: { name: true }
            }
          }
        });
        const userSubGroupName = userSubGroup?.subGroups?.name;
        
        if (userSubGroupName) {
          // Child users can see orders from their sub-group OR their own orders
          whereClause.OR = [
            { sub_group: userSubGroupName },
            { created_by: user.id }
          ];
        } else {
          // If no sub-group assigned, only see their own orders
          whereClause.created_by = user.id;
        }
      } catch (error) {
        console.error('Error fetching user sub-group:', error);
        // Fallback to user's own orders if sub-group query fails
        whereClause.created_by = user.id;
      }
    }
    // Other roles (user, client_admin, super_admin, master_admin) can see all client orders
    
    if (search) {
      // If there's already an OR clause from role filtering, combine them
      if (whereClause.OR) {
        whereClause.AND = [
          { OR: whereClause.OR },
          { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { mobile: { contains: search, mode: 'insensitive' } },
            { tracking_id: { contains: search, mode: 'insensitive' } },
            { reference_number: { contains: search, mode: 'insensitive' } }
          ]}
        ];
        delete whereClause.OR;
      } else {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { mobile: { contains: search, mode: 'insensitive' } },
          { tracking_id: { contains: search, mode: 'insensitive' } },
          { reference_number: { contains: search, mode: 'insensitive' } }
        ];
      }
    }
    
    if (fromDate && toDate) {
      whereClause.created_at = {
        gte: new Date(fromDate),
        lte: new Date(toDate + 'T23:59:59.999Z')
      };
    } else if (fromDate) {
      whereClause.created_at = {
        gte: new Date(fromDate)
      };
    } else if (toDate) {
      whereClause.created_at = {
        lte: new Date(toDate + 'T23:59:59.999Z')
      };
    }
    
    if (pickupLocation) {
      whereClause.pickup_location = pickupLocation;
    }
    
    if (courierService) {
      whereClause.courier_service = courierService;
    }
    
    if (subGroup) {
      whereClause.sub_group = subGroup;
    }
    
    if (trackingStatus) {
      if (trackingStatus === 'null') {
        // Handle "Not Dispatched" case - orders that have been processed by Delhivery 
        // but are in early stages (manifested, not picked, pending) AND have a tracking number assigned
        const notDispatchedConditions = [
          { 
            AND: [
              { tracking_status: null },
              { tracking_id: { not: null } },
              { tracking_id: { not: '' } }
            ]
          },
          { 
            AND: [
              { tracking_status: 'manifested' },
              { tracking_id: { not: null } },
              { tracking_id: { not: '' } }
            ]
          },
          { 
            AND: [
              { tracking_status: 'not picked' },
              { tracking_id: { not: null } },
              { tracking_id: { not: '' } }
            ]
          },
          { 
            AND: [
              { tracking_status: 'pending' },
              { tracking_id: { not: null } },
              { tracking_id: { not: '' } }
            ]
          }
        ];
        
        if (whereClause.OR) {
          // If there's already an OR condition (from search), we need to combine them
          whereClause.AND = [
            { OR: whereClause.OR },
            { OR: notDispatchedConditions }
          ];
          delete whereClause.OR;
        } else {
          whereClause.OR = notDispatchedConditions;
        }
      } else if (trackingStatus === 'pending') {
        // Handle "Pending" case - match pending delhivery status OR "Not assigned" tracking status OR no tracking number
        const pendingConditions = [
          { tracking_status: 'pending' },
          { tracking_status: 'Not assigned' },
          { tracking_id: null },
          { tracking_id: '' }
        ];
        
        if (whereClause.OR) {
          // If there's already an OR condition (from search), we need to combine them
          whereClause.AND = [
            { OR: whereClause.OR },
            { OR: pendingConditions }
          ];
          delete whereClause.OR;
        } else {
          whereClause.OR = pendingConditions;
        }
      } else {
        whereClause.tracking_status = trackingStatus;
      }
    }
    
    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.orders.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.orders.count({ where: whereClause })
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`✅ [API_ORDERS_GET] Found ${orders.length} orders out of ${totalCount} total for client ID: ${client.id}`);
    
    // Parse products JSON string for each order
    const processedOrders = orders.map(order => {
      // products is usually stored as a JSON string (see POST); tolerate already-structured JSON too.
      const parsedProducts = order.products
        ? (typeof order.products === 'string' ? JSON.parse(order.products) : order.products)
        : null;
      if (parsedProducts && parsedProducts.length > 0) {
        console.log('🔍 [API_ORDERS_GET] Parsed products for order:', order.id, parsedProducts);
      }
      return {
        ...order,
        products: parsedProducts
      };
    });
    
    return NextResponse.json({
      orders: processedOrders,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
    
  } catch (error) {
    console.error('❌ [API_ORDERS_GET] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    console.log('🔐 [API_ORDERS_DELETE] Starting authentication...');
    
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

    // Authorize user - allow child users to delete orders
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { user: authResult.user!, client: authResult.user!.client };

    const { client } = auth;
    const { orderIds } = await request.json();

    console.log('🗑️ [API_ORDERS_DELETE] Bulk delete request for client ID:', client.id, 'Order IDs:', orderIds);

    // Validate input
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'orderIds array is required and must contain at least one order ID' },
        { status: 400 }
      );
    }

    // Validate that all order IDs are positive integers ("12abc" and 1.5 are rejected)
    const validOrderIds = orderIds
      .map((id: unknown) => parseOrderId(String(id)))
      .filter((id: number | null): id is number => id !== null);

    if (validOrderIds.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'All order IDs must be valid positive integers' },
        { status: 400 }
      );
    }

    // Check if all orders belong to the authenticated client (security check)
    // Also fetch courier service, tracking details, and products for Delhivery cancellation and inventory restoration
    const user = authResult.user!;
    
    // Build where clause with client isolation and role-based filtering
    const whereClause: any = {
      id: { in: validOrderIds },
      clientId: client.id // Ensure client isolation
    };

    // Role-based filtering for child users
    if (user.role === 'child_user') {
      // Get user's sub-group name
      try {
        const userSubGroup = await prisma.user_sub_groups.findFirst({
          where: { userId: user.id },
          select: {
            subGroups: {
              select: { name: true }
            }
          }
        });
        const userSubGroupName = userSubGroup?.subGroups?.name;
        
        if (userSubGroupName) {
          // Child users can delete orders from their sub-group OR their own orders
          whereClause.OR = [
            { sub_group: userSubGroupName },
            { created_by: user.id }
          ];
        } else {
          // If no sub-group assigned, only delete their own orders
          whereClause.created_by = user.id;
        }
      } catch (error) {
        console.error('Error fetching user sub-group for order deletion:', error);
        // Fallback to user's own orders if sub-group query fails
        whereClause.created_by = user.id;
      }
    }
    // Other roles (user, client_admin, super_admin, master_admin) can delete all client orders

    const existingOrders = await prisma.orders.findMany({
      where: whereClause,
      select: { 
        id: true,
        courier_service: true,
        tracking_id: true,
        pickup_location: true,
        clientId: true,
        products: true // Include products for inventory restoration
      }
    });

    if (existingOrders.length !== validOrderIds.length) {
      const errorMessage = user.role === 'child_user' 
        ? 'Some orders not found or you do not have permission to delete them'
        : 'Some orders not found or do not belong to your client';
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // Cancel Delhivery orders before deletion
    const delhiveryCancelResults = [];
    for (const order of existingOrders) {
      if (order.courier_service && typeof order.courier_service === 'string' && order.courier_service.toLowerCase() === 'delhivery' && order.tracking_id) {
        try {
          console.log('🚫 [API_ORDERS_DELETE] Cancelling Delhivery order before deletion:', order.tracking_id);
          const cancelResult = await delhiveryService.cancelOrder(
            order.tracking_id,
            order.pickup_location || '',
            order.clientId
          );
          
          delhiveryCancelResults.push({
            orderId: order.id,
            waybill: order.tracking_id,
            success: cancelResult.success,
            message: cancelResult.message || cancelResult.error
          });
          
          if (cancelResult.success) {
            console.log('✅ [API_ORDERS_DELETE] Delhivery order cancelled successfully:', order.tracking_id);
          } else {
            console.warn('⚠️ [API_ORDERS_DELETE] Failed to cancel Delhivery order:', order.tracking_id, cancelResult.error);
          }
        } catch (delhiveryError) {
          console.error('❌ [API_ORDERS_DELETE] Error cancelling Delhivery order:', order.tracking_id, delhiveryError);
          delhiveryCancelResults.push({
            orderId: order.id,
            waybill: order.tracking_id,
            success: false,
            message: 'Error cancelling Delhivery order'
          });
        }
      }
    }

    console.log(`🔍 [API_ORDERS_DELETE] About to start inventory restoration logic`);
    // Restore inventory for orders with products from catalog app
    console.log(`🔄 [API_ORDERS_DELETE] Starting inventory restoration for ${existingOrders.length} orders`);
    const inventoryRestoreResults = [];
    
    // Fetch complete client data for inventory operations
    let fullClient: typeof client = client;
    try {
      fullClient = (await prisma.clients.findUnique({
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
      })) ?? client;
      console.log('🔍 [API_ORDERS_DELETE] Full client data:', fullClient);
    } catch (error) {
      console.error('Error fetching full client data:', error);
      // Fallback to original client data
      fullClient = client;
    }
    
    for (const order of existingOrders) {
      if (order.products) {
        try {
          const products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
          if (Array.isArray(products) && products.length > 0) {
            console.log(`🔄 [API_ORDERS_DELETE] Restoring inventory for order ${order.id} with ${products.length} products`);
            
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
                    inventoryRestoreResults.push({
                      orderId: order.id,
                      success: true,
                      restoredItems: restoreData.data.summary.totalRestored
                    });
                  } else {
                    const errorData = await restoreResponse.json();
                    console.error(`❌ [API_ORDERS_DELETE] Failed to restore inventory for order ${order.id}:`, errorData);
                    inventoryRestoreResults.push({
                      orderId: order.id,
                      success: false,
                      error: errorData.error
                    });
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
    }

    // Delete all orders in a transaction
    const deleteResult = await prisma.$transaction(async (tx) => {
      const deletedOrders = [];
      
      for (const orderId of validOrderIds) {
        const deletedOrder = await tx.orders.delete({
          where: { id: orderId }
        });
        deletedOrders.push(deletedOrder);
      }
      
      return deletedOrders;
    });

    console.log(`✅ [API_ORDERS_DELETE] Successfully deleted ${deleteResult.length} orders for client ID: ${client.id}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.length} orders`,
      deletedCount: deleteResult.length,
      deletedOrders: deleteResult.map(order => ({
        id: order.id,
        name: order.name,
        mobile: order.mobile,
        tracking_id: order.tracking_id
      })),
      delhiveryCancellations: delhiveryCancelResults,
      inventoryRestorations: inventoryRestoreResults
    });

  } catch (error) {
    console.error('❌ [API_ORDERS_DELETE] Error deleting orders:', error);
    return NextResponse.json(
      { error: 'Failed to delete orders' },
      { status: 500 }
    );
  }
}
