import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { mobile } = await request.json();

    // Validate mobile number
    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    // Clean and validate mobile number format
    const cleanMobile = mobile.replace(/\D/g, '');
    
    // Handle different mobile number formats
    let searchMobile = cleanMobile;
    if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
      searchMobile = cleanMobile.substring(2);
    } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
      searchMobile = cleanMobile.substring(3);
    }

    // Validate mobile number format (should be 10 digits starting with 6-9)
    if (searchMobile.length !== 10 || !/^[6-9]\d{9}$/.test(searchMobile)) {
      return NextResponse.json({ 
        error: 'Please enter a valid 10-digit mobile number' 
      }, { status: 400 });
    }

    console.log('🔍 [TRACKING_API] Searching for orders with mobile:', searchMobile);

    // Fetch orders grouped by client
    const orders = await prisma.orders.findMany({
      where: {
        mobile: searchMobile
      },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    console.log(`🔍 [TRACKING_API] Found ${orders.length} orders for mobile: ${searchMobile}`);

    // Group orders by client
    const ordersByClient = orders.reduce((acc, order) => {
      const clientId = order.clientId;
      const clientName = order.clients.companyName || order.clients.name;
      
      if (!acc[clientId]) {
        acc[clientId] = {
          clientId,
          clientName,
          orders: []
        };
      }
      
      acc[clientId].orders.push({
        id: order.id,
        name: order.name,
        mobile: order.mobile,
        tracking_id: order.tracking_id,
        courier_service: order.courier_service,
        created_at: order.created_at,
        package_value: order.package_value,
        weight: order.weight,
        total_items: order.total_items,
        address: order.address,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        is_cod: order.is_cod,
        cod_amount: order.cod_amount
      });
      
      return acc;
    }, {} as Record<string, any>);

    const groupedOrders = Object.values(ordersByClient);

    return NextResponse.json({
      success: true,
      data: {
        mobile: searchMobile,
        totalOrders: orders.length,
        ordersByClient: groupedOrders
      }
    });

  } catch (error) {
    console.error('❌ [TRACKING_API] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders. Please try again.' },
      { status: 500 }
    );
  }
}
