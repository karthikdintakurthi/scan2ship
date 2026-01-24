import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getVerificationToken } from '@/lib/otp-store-db';

// Helper function to normalize mobile number (must match verify-otp route exactly)
function normalizeMobile(mobile: string): string {
  const cleanMobile = mobile.replace(/\D/g, '');
  let normalized = cleanMobile;
  
  if (cleanMobile.length === 12 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(2);
  } else if (cleanMobile.length === 13 && cleanMobile.startsWith('91')) {
    normalized = cleanMobile.substring(3);
  }
  
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mobile, verificationToken, deviceVerified } = body;

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

    // Check if device is verified (skip OTP for remembered devices)
    if (deviceVerified) {
      // Device is remembered - allow access without OTP verification
      console.log(`✅ [TRACKING_API] Device verified - skipping OTP for mobile: ${searchMobile}`);
    } else {
      // Verify OTP token
      if (!verificationToken) {
        return NextResponse.json(
          { error: 'OTP verification required. Please verify your mobile number first.' },
          { status: 401 }
        );
      }

      // Verify token using database
      const isValid = await getVerificationToken(verificationToken, searchMobile);
      
      console.log(`🔍 [TRACKING_API] Verifying token - Token: ${verificationToken.substring(0, 8)}..., Mobile: ${searchMobile}`);
      console.log(`🔍 [TRACKING_API] Token valid: ${isValid}`);
      
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid or expired verification token. Please verify your mobile number again.' },
          { status: 401 }
        );
      }

      console.log(`✅ [TRACKING_API] Token verified successfully for mobile: ${searchMobile}`);
    }

    console.log('🔍 [TRACKING_API] Searching for orders with mobile:', searchMobile);

    // Fetch orders grouped by client
    // Search by both customer mobile and reseller mobile
    const orders = await prisma.$queryRaw`
      SELECT 
        o.id,
        o."clientId",
        o.name,
        o.mobile,
        o.reseller_mobile,
        o.address,
        o.city,
        o.state,
        o.pincode,
        o.courier_service,
        o.package_value,
        o.weight,
        o.total_items,
        o.tracking_id,
        o.reference_number,
        o.is_cod,
        o.cod_amount,
        o.created_at,
        c.id as "client_id",
        c.name as "client_name",
        c."companyName" as "client_company_name",
        CASE 
          WHEN o.mobile = ${searchMobile} THEN 'customer'
          WHEN o.reseller_mobile = ${searchMobile} THEN 'reseller'
        END as "search_type"
      FROM orders o
      LEFT JOIN clients c ON o."clientId" = c.id
      WHERE o.mobile = ${searchMobile} OR o.reseller_mobile = ${searchMobile}
      ORDER BY o.created_at DESC
    ` as any[];

    console.log(`🔍 [TRACKING_API] Found ${orders.length} orders for mobile: ${searchMobile}`);

    // Group orders by client
    const ordersByClient = orders.reduce((acc, order) => {
      const clientId = order.clientId;
      const clientName = order.client_company_name || order.client_name;
      
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
        reseller_mobile: order.reseller_mobile,
        search_type: order.search_type,
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
