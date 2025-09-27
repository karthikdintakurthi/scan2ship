import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DelhiveryService } from '@/lib/delhivery';
import { generateReferenceNumber, formatReferenceNumber, generateReferenceNumberWithPrefix, formatReferenceNumberWithPrefix } from '@/lib/reference-number';
import AnalyticsService from '@/lib/analytics-service';
import { CreditService } from '@/lib/credit-service';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { WebhookService } from '@/lib/webhook-service';
import { getCatalogApiKey } from '@/lib/cross-app-auth';

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

    const auth = { user: authResult.user!, client: authResult.user!.client };

    const { client, user } = auth;
    const orderData = await request.json();

    console.log('📦 [API_ORDERS_POST] Creating order for client ID:', client.id);

    // Check if client has sufficient credits for order creation
    const orderCreditCost = CreditService.getCreditCost('ORDER');
    const hasSufficientCredits = await CreditService.hasSufficientCredits(client.id, orderCreditCost);
    
    if (!hasSufficientCredits) {
      return NextResponse.json({ 
        error: 'Insufficient credits',
        details: `Order creation requires ${orderCreditCost} credits. Please contact your administrator to add more credits.`
      }, { status: 402 });
    }

    // Validate required fields
    const requiredFields = ['name', 'mobile', 'address', 'city', 'state', 'country', 'pincode', 'courier_service', 'pickup_location', 'package_value', 'weight', 'total_items'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Validate mobile number format
    const validateMobileNumber = (mobile: string): boolean => {
      // Remove any non-digit characters
      const cleanMobile = mobile.replace(/\D/g, '');
      
      // Handle different cases:
      // 1. 10 digits starting with 6-9 (direct mobile number)
      // 2. 12 digits starting with 91 (country code + mobile)
      // 3. 13 digits starting with 91 (country code + mobile with leading 0)
      
      if (cleanMobile.length === 10) {
        return /^[6-9]\d{9}$/.test(cleanMobile);
      } else if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
        const mobilePart = cleanMobile.substring(2);
        return /^[6-9]\d{9}$/.test(mobilePart);
      } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
        const mobilePart = cleanMobile.substring(3); // Remove 91 and leading 0
        return /^[6-9]\d{9}$/.test(mobilePart);
      }
      
      return false;
    };

    if (!validateMobileNumber(orderData.mobile)) {
      return NextResponse.json({ error: 'Mobile number must be exactly 10 digits and start with 6, 7, 8, or 9' }, { status: 400 });
    }


    // Validate reseller mobile number if provided
    if (orderData.reseller_mobile && !validateMobileNumber(orderData.reseller_mobile)) {
      return NextResponse.json({ error: 'Reseller mobile number must be exactly 10 digits and start with 6, 7, 8, or 9' }, { status: 400 });
    }

    // Get client order configuration for reference number prefix
    const clientOrderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });

    // Get user's sub-group name for the order
    let subGroupName = null;
    if (user.role === 'child_user') {
      try {
        const userSubGroup = await prisma.user_sub_groups.findFirst({
          where: { userId: user.id },
          select: {
            subGroups: {
              select: { name: true }
            }
          }
        });
        subGroupName = userSubGroup?.subGroups?.name || null;
      } catch (error) {
        console.error('Error fetching user sub-group for order creation:', error);
        subGroupName = null;
      }
    }

    // Generate or format reference number with prefix configuration
    let referenceNumber: string;
    if (orderData.reference_number && orderData.reference_number.trim()) {
      // Use custom reference value with mobile number and prefix configuration
      referenceNumber = formatReferenceNumberWithPrefix(
        orderData.reference_number.trim(), 
        orderData.mobile,
        clientOrderConfig?.enableReferencePrefix ?? true,
        clientOrderConfig?.referencePrefix ?? 'REF'
      );
    } else {
      // Auto-generate reference number with prefix configuration
      referenceNumber = generateReferenceNumberWithPrefix(
        orderData.mobile,
        clientOrderConfig?.enableReferencePrefix ?? true,
        clientOrderConfig?.referencePrefix ?? 'REF'
      );
    }

    // Convert string values to appropriate data types and map fields
    const processedOrderData = {
      ...orderData,
      package_value: parseFloat(orderData.package_value) || 0,
      weight: parseFloat(orderData.weight) || 0,
      total_items: parseInt(orderData.total_items) || 1,
      cod_amount: orderData.cod_amount ? parseFloat(orderData.cod_amount) : null,
      tracking_id: orderData.waybill || orderData.tracking_id || null, // Map waybill to tracking_id
      reference_number: referenceNumber,
      clientId: client.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Remove fields that are not in the database schema
    delete processedOrderData.waybill;
    delete processedOrderData.creationPattern;
    delete processedOrderData.skip_tracking;
    
    // Handle products field - convert to JSON if present
    if (orderData.products && Array.isArray(orderData.products)) {
      console.log('🔍 [API_ORDERS_POST] Products data received:', orderData.products);
      processedOrderData.products = JSON.stringify(orderData.products);
      console.log('🔍 [API_ORDERS_POST] Products data saved as JSON:', processedOrderData.products);
    }
    
    // Log the processed data for debugging
    console.log('🔍 [API_ORDERS_POST] Processed order data:', processedOrderData);

    // Handle Delhivery API call first if courier service is Delhivery (case-insensitive) and skip_tracking is not enabled
    let delhiveryResponse = null;
    if (orderData.courier_service && typeof orderData.courier_service === 'string' && orderData.courier_service.toLowerCase() === 'delhivery' && !orderData.skip_tracking) {
      try {
        console.log('🚚 [API_ORDERS_POST] Calling Delhivery API before creating order');
        console.log('🚚 [API_ORDERS_POST] Order data being sent to Delhivery:', JSON.stringify(processedOrderData, null, 2));
        console.log('🚚 [API_ORDERS_POST] Pickup location:', processedOrderData.pickup_location);
        
        // Create a temporary order object for Delhivery API call
        const tempOrder = {
          ...processedOrderData,
          id: 0 // Temporary ID for API call
        };
        
        delhiveryResponse = await delhiveryService.createOrder(tempOrder);
        
        console.log('🚚 [API_ORDERS_POST] Delhivery API response received:', JSON.stringify(delhiveryResponse, null, 2));
        
        if (!delhiveryResponse.success) {
          console.log('❌ [API_ORDERS_POST] Delhivery API failed, not creating order');
          return NextResponse.json({
            success: false,
            error: 'Delhivery API failed',
            details: delhiveryResponse.error || 'Failed to create order with Delhivery',
            delhiveryError: delhiveryResponse.error
          }, { status: 400 });
        }
        
        console.log('✅ [API_ORDERS_POST] Delhivery API succeeded, proceeding with order creation');
      } catch (error) {
        console.error('❌ [API_ORDERS_POST] Delhivery API error:', error);
        console.error('❌ [API_ORDERS_POST] Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        
        return NextResponse.json({
          success: false,
          error: 'Delhivery API failed',
          details: error instanceof Error ? error.message : 'Unknown error occurred while creating order with Delhivery'
        }, { status: 400 });
      }
    } else {
      if (orderData.courier_service && typeof orderData.courier_service === 'string' && orderData.courier_service.toLowerCase() === 'delhivery' && orderData.skip_tracking) {
        console.log('📝 [API_ORDERS_POST] Skipping Delhivery API - skip_tracking enabled for Delhivery order');
      } else {
        console.log('📝 [API_ORDERS_POST] Skipping Delhivery API for courier service:', orderData.courier_service);
      }
    }

    // Create order with client ID (only if Delhivery succeeded or not required)
    // Set tracking_status to 'pending' if no tracking ID is assigned
    const orderDataToCreate = {
      ...processedOrderData,
      created_by: user.id, // Track who created this order
      sub_group: subGroupName, // Track which sub-group the user belongs to
      tracking_status: processedOrderData.tracking_id ? null : 'pending'
    };
    
    const order = await prisma.orders.create({
      data: orderDataToCreate
    });

    console.log('✅ [API_ORDERS_POST] Order created successfully:', order.id);

    // Update order with Delhivery data if available
    if (delhiveryResponse && delhiveryResponse.success) {
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          delhivery_waybill_number: delhiveryResponse.waybill_number,
          delhivery_order_id: delhiveryResponse.order_id,
          delhivery_api_status: 'success',
          tracking_status: 'manifested',
          tracking_id: delhiveryResponse.waybill_number,
          last_delhivery_attempt: new Date()
        }
      });
      
      console.log('✅ [API_ORDERS_POST] Delhivery data updated in order');
    }

    // Deduct credits for order creation
    try {
      await CreditService.deductOrderCredits(client.id, user.id, order.id);
      console.log('💳 [API_ORDERS_POST] Credits deducted for order creation:', orderCreditCost);
    } catch (creditError) {
      console.error('❌ [API_ORDERS_POST] Failed to deduct credits:', creditError);
      // Note: We don't fail the order creation if credit deduction fails
      // The order is already created, but we log the error
    }

    // Track order creation analytics
    try {
      // Determine creation pattern from request body
      const creationPattern = (orderData as any).creationPattern || 'manual';
      
      // Track order creation analytics
      await AnalyticsService.trackOrderCreation({
        orderId: order.id,
        clientId: auth.user.clientId,
        userId: auth.user.id,
        creationPattern
      });

      // Track create_order event
      await AnalyticsService.trackEvent({
        eventType: 'create_order',
        clientId: auth.user.clientId,
        userId: auth.user.id,
        eventData: {
          orderId: order.id,
          creationPattern,
          courierService: orderData.courier_service
        }
      });
      
      console.log('📊 [API_ORDERS_POST] Order analytics tracked:', {
        orderId: order.id,
        pattern: creationPattern
      });
    } catch (analyticsError) {
      console.warn('⚠️ [API_ORDERS_POST] Failed to track order analytics:', analyticsError);
    }

    // Fetch updated order data to get latest tracking number
    const updatedOrder = await prisma.orders.findUnique({
      where: { id: order.id }
    });

    if (!updatedOrder) {
      console.error('❌ [API_ORDERS_POST] Failed to fetch updated order data');
      return NextResponse.json({ error: 'Failed to fetch updated order data' }, { status: 500 });
    }


    // Trigger webhooks for order creation
    try {
      console.log('🔗 [API_ORDERS_POST] Triggering webhooks for order creation');
      
      const webhookData = {
        order: {
          id: updatedOrder.id,
          orderNumber: `ORDER-${updatedOrder.id}`,
          referenceNumber: updatedOrder.reference_number,
          trackingId: updatedOrder.tracking_id,
          name: updatedOrder.name,
          mobile: updatedOrder.mobile,
          address: updatedOrder.address,
          city: updatedOrder.city,
          state: updatedOrder.state,
          country: updatedOrder.country,
          pincode: updatedOrder.pincode,
          courierService: updatedOrder.courier_service,
          pickupLocation: updatedOrder.pickup_location,
          packageValue: updatedOrder.package_value,
          weight: updatedOrder.weight,
          totalItems: updatedOrder.total_items,
          isCod: updatedOrder.is_cod,
          codAmount: updatedOrder.cod_amount,
          resellerName: updatedOrder.reseller_name,
          resellerMobile: updatedOrder.reseller_mobile,
          createdAt: updatedOrder.created_at,
          updatedAt: updatedOrder.updated_at,
          delhiveryWaybillNumber: updatedOrder.delhivery_waybill_number,
          delhiveryOrderId: updatedOrder.delhivery_order_id,
          delhiveryApiStatus: updatedOrder.delhivery_api_status
        },
        client: {
          id: client.id,
          companyName: client.id, // Using client ID as company name fallback
          name: client.id, // Using client ID as name fallback
          email: user.email // Using user email as fallback
        }
      };

      // Trigger webhook asynchronously to not block the response
      WebhookService.triggerWebhooks('order.created', webhookData, client.id, updatedOrder.id)
        .then(() => {
          console.log('✅ [API_ORDERS_POST] Webhooks triggered successfully');
        })
        .catch((webhookError) => {
          console.error('❌ [API_ORDERS_POST] Webhook trigger failed:', webhookError);
        });
    } catch (webhookError) {
      console.error('❌ [API_ORDERS_POST] Webhook setup failed:', webhookError);
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: `ORDER-${order.id}`,
        referenceNumber: order.reference_number,
        trackingId: order.tracking_id,
        delhiveryStatus: order.delhivery_api_status
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
      const parsedProducts = order.products ? JSON.parse(order.products) : null;
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

    // Validate that all order IDs are valid integers
    const validOrderIds = orderIds.filter(id => {
      const numId = parseInt(id);
      return !isNaN(numId) && numId > 0;
    });

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
    
    for (const order of existingOrders) {
      if (order.products) {
        try {
          const products = JSON.parse(order.products);
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
          where: { id: parseInt(orderId) }
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
