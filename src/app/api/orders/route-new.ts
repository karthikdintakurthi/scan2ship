import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { DelhiveryService } from '@/lib/delhivery';
import whatsappService, { initializeWhatsAppService } from '@/lib/whatsapp-service';
import { generateReferenceNumber, formatReferenceNumber } from '@/lib/reference-number';
import AnalyticsService from '@/lib/analytics-service';

const delhiveryService = new DelhiveryService();

// Helper function to get authenticated user and client
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    
    // For now, let's use a simpler approach without session validation
    // We'll implement proper session management later
    return {
      user: { id: decoded.userId, email: decoded.email, role: decoded.role },
      client: { id: decoded.clientId }
    };
  } catch (error) {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client } = auth;
    const orderData = await request.json();

    console.log('📦 [API_ORDERS_POST] Creating order for client:', client.id);

    // Validate required fields
    const requiredFields = ['name', 'mobile', 'address', 'city', 'state', 'country', 'pincode', 'courier_service', 'pickup_location', 'package_value', 'weight', 'total_items'];
    for (const field of requiredFields) {
      if (!orderData[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    // Get client order configuration to check prefix setting
    let clientOrderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id }
    });
    
    // If no config exists, create default one
    if (!clientOrderConfig) {
      clientOrderConfig = await prisma.client_order_configs.create({
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
          // Order ID settings
          enableOrderIdPrefix: true // Default to true for backward compatibility
        }
      });
    }
    
    // Generate or format reference number based on client configuration
    let referenceNumber: string;
    const enablePrefix = clientOrderConfig.enableOrderIdPrefix;
    
    if (orderData.reference_number && orderData.reference_number.trim()) {
      // Use custom reference value with or without mobile number based on setting
      referenceNumber = formatReferenceNumber(orderData.reference_number.trim(), orderData.mobile, enablePrefix);
    } else {
      // Auto-generate reference number with or without mobile number based on setting
      referenceNumber = generateReferenceNumber(orderData.mobile, enablePrefix);
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
    
    // Log the processed data for debugging
    console.log('🔍 [API_ORDERS_POST] Processed order data:', processedOrderData);

    // Create order with client ID
    const order = await prisma.Order.create({
      data: processedOrderData
    });

    console.log('✅ [API_ORDERS_POST] Order created successfully:', order.id);

    // Track order creation analytics
    try {
      // Determine creation pattern from request body
      const creationPattern = (orderData as any).creationPattern || 'manual';
      
      await AnalyticsService.trackOrderCreation({
        orderId: order.id,
        clientId: auth.user.clientId,
        userId: auth.user.id,
        creationPattern
      });
      
      console.log('📊 [API_ORDERS_POST] Order analytics tracked:', {
        orderId: order.id,
        pattern: creationPattern
      });
    } catch (analyticsError) {
      console.warn('⚠️ [API_ORDERS_POST] Failed to track order analytics:', analyticsError);
    }

    // Handle Delhivery API call if courier service is Delhivery (case-insensitive)
    if (orderData.courier_service.toLowerCase() === 'delhivery') {
      try {
        console.log('🚚 [API_ORDERS_POST] Calling Delhivery API for order:', order.id);
        
        const delhiveryResponse = await delhiveryService.createOrder(order);
        
        if (delhiveryResponse.success) {
                  // Update order with Delhivery data
        await prisma.Order.update({
          where: { id: order.id },
          data: {
            delhivery_waybill_number: delhiveryResponse.waybill_number,
            delhivery_order_id: delhiveryResponse.order_id,
            delhivery_api_status: 'success',
            tracking_id: delhiveryResponse.waybill_number,
            last_delhivery_attempt: new Date()
          }
        });
          
          console.log('✅ [API_ORDERS_POST] Delhivery order created successfully');
        } else {
                  // Update order with error status
        await prisma.Order.update({
          where: { id: order.id },
          data: {
            delhivery_api_status: 'failed',
            delhivery_api_error: delhiveryResponse.error,
            last_delhivery_attempt: new Date()
          }
        });
          
          console.log('❌ [API_ORDERS_POST] Delhivery order failed:', delhiveryResponse.error);
        }
      } catch (error) {
        console.error('❌ [API_ORDERS_POST] Delhivery API error:', error);
        
        // Update order with error status
        await prisma.Order.update({
          where: { id: order.id },
          data: {
            delhivery_api_status: 'failed',
            delhivery_api_error: error instanceof Error ? error.message : 'Unknown error',
            last_delhivery_attempt: new Date()
          }
        });
      }
    } else {
      console.log('📝 [API_ORDERS_POST] Skipping Delhivery API for courier service:', orderData.courier_service);
    }

    // Fetch updated order data to get latest tracking number
    const updatedOrder = await prisma.Order.findUnique({
      where: { id: order.id }
    });

    if (!updatedOrder) {
      console.error('❌ [API_ORDERS_POST] Failed to fetch updated order data');
      return NextResponse.json({ error: 'Failed to fetch updated order data' }, { status: 500 });
    }

    // Initialize WhatsApp service with database configuration
    await initializeWhatsAppService();

    // Send WhatsApp notifications with updated tracking number
    try {
      const whatsappData = {
        customerName: updatedOrder.name,
        customerPhone: updatedOrder.mobile,
        orderNumber: `ORDER-${updatedOrder.id}`,
        courierService: updatedOrder.courier_service,
        trackingNumber: updatedOrder.tracking_id || 'Will be assigned',
        clientCompanyName: client.companyName || 'Scan2Ship',
        resellerName: updatedOrder.reseller_name || undefined,
        resellerPhone: updatedOrder.reseller_mobile || undefined,
        packageValue: updatedOrder.package_value,
        weight: updatedOrder.weight,
        totalItems: updatedOrder.total_items,
        pickupLocation: updatedOrder.pickup_location,
        address: updatedOrder.address,
        city: updatedOrder.city,
        state: updatedOrder.state,
        pincode: updatedOrder.pincode
      };

      // Send customer WhatsApp message
      const customerWhatsAppResult = await whatsappService.sendCustomerOrderWhatsApp(whatsappData);
      if (customerWhatsAppResult.success) {
        console.log('📱 [API_ORDERS_POST] Customer WhatsApp message sent for order:', updatedOrder.id);
      } else {
        console.warn('⚠️ [API_ORDERS_POST] Customer WhatsApp message failed for order:', updatedOrder.id, customerWhatsAppResult.error);
      }

      // Send reseller WhatsApp message if reseller details are provided
      if (updatedOrder.reseller_name && updatedOrder.reseller_mobile) {
        const resellerWhatsAppResult = await whatsappService.sendResellerOrderWhatsApp(whatsappData);
        if (resellerWhatsAppResult.success) {
          console.log('📱 [API_ORDERS_POST] Reseller WhatsApp message sent for order:', updatedOrder.id);
        } else {
          console.warn('⚠️ [API_ORDERS_POST] Reseller WhatsApp message failed for order:', updatedOrder.id, resellerWhatsAppResult.error);
        }
      }
    } catch (whatsappError) {
      console.error('❌ [API_ORDERS_POST] WhatsApp sending failed:', whatsappError);
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
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { client } = auth;
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const fromDate = searchParams.get('fromDate') || '';
    const toDate = searchParams.get('toDate') || '';
    const pickupLocation = searchParams.get('pickupLocation') || '';
    const courierService = searchParams.get('courierService') || '';
    
    console.log('🔍 [API_ORDERS_GET] Request parameters:', { page, limit, search, fromDate, toDate, pickupLocation, courierService, clientId: client.id });
    
    const skip = (page - 1) * limit;
    
    // Build where clause with client isolation
    const whereClause: any = {
      clientId: client.id // Ensure client isolation
    };
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { tracking_id: { contains: search, mode: 'insensitive' } },
        { reference_number: { contains: search, mode: 'insensitive' } }
      ];
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
    
    // Get orders with pagination
    const [orders, totalCount] = await Promise.all([
      prisma.Order.findMany({
        where: whereClause,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.Order.count({ where: whereClause })
    ]);
    
    const totalPages = Math.ceil(totalCount / limit);
    
    console.log(`✅ [API_ORDERS_GET] Found ${orders.length} orders out of ${totalCount} total for client: ${client.id}`);
    
    return NextResponse.json({
      orders,
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
    
    // Check if authorization header exists
    const authHeader = request.headers.get('authorization');
    console.log('🔐 [API_ORDERS_DELETE] Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [API_ORDERS_DELETE] Invalid or missing authorization header');
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 });
    }
    
    // Authenticate user
    const auth = await getAuthenticatedUser(request);
    console.log('🔐 [API_ORDERS_DELETE] Authentication result:', auth ? 'Success' : 'Failed');
    
    if (!auth) {
      console.log('❌ [API_ORDERS_DELETE] Authentication failed - user not found or inactive');
      return NextResponse.json({ error: 'Unauthorized - Authentication failed' }, { status: 401 });
    }

    const { client } = auth;
    const { orderIds } = await request.json();

    console.log('🗑️ [API_ORDERS_DELETE] Bulk delete request for client:', client.companyName, 'Order IDs:', orderIds);

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
    const existingOrders = await prisma.Order.findMany({
      where: {
        id: { in: validOrderIds },
        clientId: client.id // Ensure client isolation
      },
      select: { id: true }
    });

    if (existingOrders.length !== validOrderIds.length) {
      return NextResponse.json(
        { error: 'Some orders not found or do not belong to your client' },
        { status: 404 }
      );
    }

    // Delete all orders in a transaction
    const deleteResult = await prisma.$transaction(async (tx) => {
      const deletedOrders = [];
      
      for (const orderId of validOrderIds) {
        const deletedOrder = await tx.order.delete({
          where: { id: parseInt(orderId) }
        });
        deletedOrders.push(deletedOrder);
      }
      
      return deletedOrders;
    });

    console.log(`✅ [API_ORDERS_DELETE] Successfully deleted ${deleteResult.length} orders for client: ${client.companyName}`);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${deleteResult.length} orders`,
      deletedCount: deleteResult.length,
      deletedOrders: deleteResult.map(order => ({
        id: order.id,
        name: order.name,
        mobile: order.mobile,
        tracking_id: order.tracking_id
      }))
    });

  } catch (error) {
    console.error('❌ [API_ORDERS_DELETE] Error deleting orders:', error);
    return NextResponse.json(
      { error: 'Failed to delete orders' },
      { status: 500 }
    );
  }
}
