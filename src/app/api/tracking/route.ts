import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { maskMobile, maskName, normalizeIndianMobile } from '@/lib/application/public-tracking';

const MAX_ORDERS = 50;

interface TrackingRow {
  id: number;
  clientId: string;
  name: string;
  courier_service: string;
  tracking_id: string | null;
  tracking_status: string | null;
  created_at: Date;
  client_name: string | null;
  client_company_name: string | null;
  search_type: 'customer' | 'reseller';
}

/**
 * Public shipment lookup by phone number. Anyone who knows a number can call
 * it, so it returns only what a recipient needs to follow a parcel: masked
 * name, courier, tracking number, status, and date. It is rate limited by IP.
 */
export async function POST(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'tracking', cors: true, securityHeaders: true }
    );

    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    const { mobile } = (await request.json()) ?? {};

    if (!mobile || typeof mobile !== 'string') {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    const searchMobile = normalizeIndianMobile(mobile);
    if (!searchMobile) {
      return NextResponse.json({
        error: 'Please enter a valid 10-digit mobile number'
      }, { status: 400 });
    }

    console.log('🔍 [TRACKING_API] Searching for orders with mobile:', maskMobile(searchMobile));

    const orders = await prisma.$queryRaw<TrackingRow[]>`
      SELECT
        o.id,
        o."clientId",
        o.name,
        o.courier_service,
        o.tracking_id,
        o.tracking_status,
        o.created_at,
        c.name as "client_name",
        c."companyName" as "client_company_name",
        CASE
          WHEN o.mobile = ${searchMobile} THEN 'customer'
          ELSE 'reseller'
        END as "search_type"
      FROM orders o
      LEFT JOIN clients c ON o."clientId" = c.id
      WHERE o.mobile = ${searchMobile} OR o.reseller_mobile = ${searchMobile}
      ORDER BY o.created_at DESC
      LIMIT ${MAX_ORDERS}
    `;

    // Group by seller under an opaque key; internal tenant IDs are not exposed
    const groups = new Map<string, { clientId: string; clientName: string; orders: unknown[] }>();
    for (const order of orders) {
      if (!groups.has(order.clientId)) {
        groups.set(order.clientId, {
          clientId: `seller-${groups.size + 1}`,
          clientName: order.client_company_name || order.client_name || 'Seller',
          orders: []
        });
      }
      groups.get(order.clientId)!.orders.push({
        id: order.id,
        name: maskName(order.name),
        search_type: order.search_type,
        tracking_id: order.tracking_id,
        tracking_status: order.tracking_status,
        courier_service: order.courier_service,
        created_at: order.created_at
      });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        mobile: maskMobile(searchMobile),
        totalOrders: orders.length,
        ordersByClient: [...groups.values()]
      }
    });
    securityHeaders(response);
    return response;

  } catch (error) {
    console.error('❌ [TRACKING_API] Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders. Please try again.' },
      { status: 500 }
    );
  }
}
