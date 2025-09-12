import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [API_REPORTS] Starting reports API call...');
    
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      console.log('🚫 [API_REPORTS] Security middleware blocked request');
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
      console.log('🚫 [API_REPORTS] Authorization failed');
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const auth = { userId: authResult.user!.id, user: authResult.user!, client: authResult.user!.client };
    console.log('✅ [API_REPORTS] User authorized:', auth.user.email, 'Client:', auth.user.clientId);

    // Get date range from query parameters
    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    
    // Set default date range (last 12 months if no dates provided)
    let startDate: Date;
    let endDate: Date;
    
    try {
      if (startDateParam && endDateParam) {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }
        
        if (startDate > endDate) {
          return NextResponse.json({ error: 'Start date cannot be after end date' }, { status: 400 });
        }
      } else {
        // Default date range: Start from August 2025 to current date
        endDate = new Date();
        startDate = new Date('2025-08-01'); // August 1, 2025
        
        // If current date is before August 2025, set end date to August 2025
        if (endDate < startDate) {
          endDate = new Date('2025-08-31'); // August 31, 2025
        }
      }
    } catch (dateError) {
      console.error('❌ [API_REPORTS] Date parsing error:', dateError);
      return NextResponse.json({ error: 'Invalid date parameters' }, { status: 400 });
    }

    console.log('📅 [API_REPORTS] Date range:', { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

    // Fetch orders for the client within date range - ONLY DELHIVERY ORDERS
    console.log('🔍 [API_REPORTS] Querying Delhivery orders for client:', auth.user.clientId);
    let orders;
    try {
      orders = await prisma.orders.findMany({
        where: {
          clientId: auth.user.clientId,
          courier_service: 'delhivery', // Only Delhivery orders
          created_at: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          id: true,
          created_at: true,
          tracking_id: true,
          courier_service: true, // Include courier service for verification
          delhivery_api_status: true,
          delhivery_tracking_status: true,
          shopify_status: true
        },
        orderBy: {
          created_at: 'desc'
        }
      });
      console.log('📦 [API_REPORTS] Found Delhivery orders:', orders.length);
    } catch (dbError) {
      console.error('❌ [API_REPORTS] Database query error:', dbError);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    // Map database status to report status using the same logic as TrackingStatusLabel
    const getOrderStatus = (order: any) => {
      // Use delhivery_tracking_status as the primary source (this is updated by cron job)
      if (order.delhivery_tracking_status) {
        const status = order.delhivery_tracking_status.toLowerCase();
        
        // Map to report statuses (matching UI logic)
        if (status === 'delivered') {
          return 'delivered';
        } else if (status === 'manifested' || status === 'not picked' || status === 'pending') {
          return 'pending'; // Not Dispatched
        } else if (status === 'returned') {
          return 'returned';
        } else if (status === 'failed') {
          return 'failed';
        } else {
          return 'dispatched'; // in_transit, dispatched, success, etc. → In Transit
        }
      }
      
      // Fallback: Check if order has tracking_id (indicates it's been dispatched)
      if (order.tracking_id && order.tracking_id.trim() !== '') {
        return 'dispatched';
      }
      
      // Check shopify status as fallback
      if (order.shopify_status === 'fulfilled') {
        return 'dispatched';
      } else if (order.shopify_status === 'failed') {
        return 'failed';
      }
      
      // Default to pending for new orders
      return 'pending';
    };

    // Calculate status breakdown
    const statusCounts = {
      pending: 0,
      dispatched: 0,
      delivered: 0,
      returned: 0,
      failed: 0
    };

    orders.forEach(order => {
      const status = getOrderStatus(order);
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts]++;
      }
    });

    // Debug logging for accuracy verification
    console.log('📊 [API_REPORTS] Status breakdown calculated:', statusCounts);
    console.log('📊 [API_REPORTS] Sample Delhivery orders with status mapping:', 
      orders.slice(0, 5).map(order => ({
        id: order.id,
        courier_service: order.courier_service,
        delhivery_tracking_status: order.delhivery_tracking_status,
        delhivery_api_status: order.delhivery_api_status,
        tracking_id: order.tracking_id,
        mapped_status: getOrderStatus(order)
      }))
    );
    
    // Verify all orders are Delhivery
    const nonDelhiveryOrders = orders.filter(order => order.courier_service !== 'delhivery');
    if (nonDelhiveryOrders.length > 0) {
      console.warn('⚠️ [API_REPORTS] Found non-Delhivery orders in results:', nonDelhiveryOrders.length);
    } else {
      console.log('✅ [API_REPORTS] All orders are Delhivery orders');
    }

    // Calculate monthly breakdown
    const monthlyData = new Map();
    
    try {
      console.log(`📅 [API_REPORTS] Generating months from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      
      // Initialize months in the date range
      const tempDate = new Date(startDate);
      const endDateCopy = new Date(endDate);
      
      // Ensure we include the end month by setting it to the last day of the month
      endDateCopy.setDate(1);
      endDateCopy.setMonth(endDateCopy.getMonth() + 1);
      endDateCopy.setDate(0); // Last day of the end month
      
      console.log(`📅 [API_REPORTS] Adjusted end date: ${endDateCopy.toISOString()}`);
      
      while (tempDate <= endDateCopy) {
        const monthKey = tempDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        console.log(`📅 [API_REPORTS] Adding month: ${monthKey} (${tempDate.toISOString().split('T')[0]})`);
        
        monthlyData.set(monthKey, {
          month: monthKey,
          orders: 0,
          pending: 0,
          dispatched: 0,
          delivered: 0,
          returned: 0,
          failed: 0
        });
        tempDate.setMonth(tempDate.getMonth() + 1);
      }
      
      console.log(`📅 [API_REPORTS] Generated ${monthlyData.size} months:`, Array.from(monthlyData.keys()));
    } catch (monthError) {
      console.error('❌ [API_REPORTS] Monthly data initialization error:', monthError);
      return NextResponse.json({ error: 'Failed to initialize monthly data' }, { status: 500 });
    }

    // Populate monthly data
    try {
      orders.forEach(order => {
        const orderDate = new Date(order.created_at);
        const monthKey = orderDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (monthlyData.has(monthKey)) {
          const monthData = monthlyData.get(monthKey);
          monthData.orders += 1;
          
          const status = getOrderStatus(order);
          if (status in monthData) {
            monthData[status]++;
          }
        }
      });
    } catch (processError) {
      console.error('❌ [API_REPORTS] Monthly data processing error:', processError);
      return NextResponse.json({ error: 'Failed to process monthly data' }, { status: 500 });
    }

    // Calculate total orders
    const totalOrders = orders.length;

    // Format response
    try {
      // Sort monthly trends by date (oldest first)
      const sortedMonthlyTrends = Array.from(monthlyData.values()).sort((a, b) => {
        const dateA = new Date(a.month + ' 1, ' + a.month.split(' ')[1]);
        const dateB = new Date(b.month + ' 1, ' + b.month.split(' ')[1]);
        return dateA.getTime() - dateB.getTime();
      });
      
      const reportData = {
        totalOrders,
        statusBreakdown: statusCounts,
        monthlyTrends: sortedMonthlyTrends,
        dateRange: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        filters: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      };

      console.log('✅ [API_REPORTS] Report data generated successfully');
      return NextResponse.json(reportData);
    } catch (formatError) {
      console.error('❌ [API_REPORTS] Response formatting error:', formatError);
      return NextResponse.json({ error: 'Failed to format response data' }, { status: 500 });
    }
  } catch (error) {
    console.error('❌ [API_REPORTS_GET] Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}