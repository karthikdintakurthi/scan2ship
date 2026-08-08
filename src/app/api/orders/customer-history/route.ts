import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

// Hard ceiling on how many past orders we return, independent of the configured
// day window — keeps the payload bounded for high-volume repeat customers.
const MAX_RESULTS = 25;
// Bounds for the configured lookback window, applied server-side.
const MIN_DAYS = 1;
const MAX_DAYS = 365;

/**
 * GET /api/orders/customer-history?mobile=9876543210
 *
 * Returns this client's recent orders for a customer mobile number, so the
 * create-order screen can warn about likely duplicates.
 *
 * The lookback window is read from the caller's own client config rather than
 * taken from the query string — a caller must not be able to widen it.
 */
export async function GET(request: NextRequest) {
  try {
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );

    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

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

    const client = authResult.user!.client;

    const { searchParams } = new URL(request.url);
    const rawMobile = searchParams.get('mobile') || '';

    // Normalise to the last 10 digits so 9876543210, +919876543210 and
    // 09876543210 all resolve to the same customer.
    const digits = rawMobile.replace(/\D/g, '');
    const mobile = digits.slice(-10);

    if (mobile.length !== 10) {
      return NextResponse.json(
        { error: 'A valid 10-digit mobile number is required' },
        { status: 400 }
      );
    }

    // Feature flag + window come from this client's config.
    const orderConfig = await prisma.client_order_configs.findUnique({
      where: { clientId: client.id },
      select: {
        enableCustomerOrderHistory: true,
        customerOrderHistoryDays: true
      }
    });

    if (!orderConfig?.enableCustomerOrderHistory) {
      return NextResponse.json({
        success: true,
        enabled: false,
        days: 0,
        mobile,
        count: 0,
        orders: []
      });
    }

    const days = Math.min(
      MAX_DAYS,
      Math.max(MIN_DAYS, orderConfig.customerOrderHistoryDays ?? 30)
    );

    const since = new Date();
    since.setDate(since.getDate() - days);

    const orders = await prisma.orders.findMany({
      where: {
        clientId: client.id, // tenant isolation — never widen this
        created_at: { gte: since },
        OR: [
          { mobile: { endsWith: mobile } },
          { reseller_mobile: { endsWith: mobile } }
        ]
      },
      orderBy: { created_at: 'desc' },
      take: MAX_RESULTS,
      // Detail fields are included here so the modal can switch between list and
      // detail views without a second request.
      select: {
        id: true,
        name: true,
        mobile: true,
        reseller_mobile: true,
        reseller_name: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        courier_service: true,
        pickup_location: true,
        package_value: true,
        weight: true,
        total_items: true,
        product_description: true,
        is_cod: true,
        cod_amount: true,
        tracking_id: true,
        reference_number: true,
        tracking_status: true,
        delhivery_api_status: true,
        created_at: true
      }
    });

    const response = NextResponse.json({
      success: true,
      enabled: true,
      days,
      mobile,
      count: orders.length,
      truncated: orders.length === MAX_RESULTS,
      orders
    });
    securityHeaders(response);
    return response;
  } catch (error) {
    console.error('❌ [API_CUSTOMER_HISTORY] Failed to fetch customer order history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer order history' },
      { status: 500 }
    );
  }
}
