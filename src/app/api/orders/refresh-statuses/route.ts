import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { orderAccessWhere } from '@/lib/application/policy';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';

const MAX_ORDERS_PER_REQUEST = 100;

type RefreshResult = {
  orderId: number;
  trackingId: string;
  success: boolean;
  oldStatus?: string;
  newStatus?: string;
  error?: string;
};

export async function POST(request: NextRequest) {
  try {
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      return authResult.response;
    }
    const user = authResult.user!;

    const { orderIds } = await request.json();

    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({
        error: 'Order IDs array is required and must not be empty'
      }, { status: 400 });
    }

    if (orderIds.length > MAX_ORDERS_PER_REQUEST) {
      return NextResponse.json({
        error: `Cannot refresh more than ${MAX_ORDERS_PER_REQUEST} orders at once`
      }, { status: 400 });
    }

    if (!orderIds.every((id) => Number.isSafeInteger(id) && id > 0)) {
      return NextResponse.json({ error: 'Order IDs must be positive integers' }, { status: 400 });
    }

    console.log(`🔄 [MANUAL_REFRESH] Starting manual status refresh for ${orderIds.length} orders`);

    const orders = await prisma.orders.findMany({
      where: {
        AND: [
          await orderAccessWhere(user),
          { id: { in: orderIds }, tracking_id: { not: null }, courier_service: 'delhivery' }
        ]
      },
      select: { id: true, tracking_id: true, tracking_status: true, pickup_location: true }
    });

    if (orders.length === 0) {
      return NextResponse.json({
        error: 'No valid Delhivery orders found with tracking IDs'
      }, { status: 404 });
    }

    console.log(`📦 [MANUAL_REFRESH] Found ${orders.length} accessible orders to refresh`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const results: RefreshResult[] = [];

    const recordFailure = async (order: (typeof orders)[number], error: string) => {
      totalProcessed++;
      totalErrors++;
      await prisma.orders.update({
        where: { id: order.id },
        data: { delhivery_api_error: error, updated_at: new Date() }
      });
      results.push({ orderId: order.id, trackingId: order.tracking_id!, success: false, error });
    };

    // Each pickup location has its own Delhivery account and key
    const ordersByPickup = new Map<string, typeof orders>();
    for (const order of orders) {
      const group = ordersByPickup.get(order.pickup_location) ?? [];
      group.push(order);
      ordersByPickup.set(order.pickup_location, group);
    }

    for (const [pickupLocation, pickupOrders] of ordersByPickup) {
      const apiKey = await getDelhiveryApiKey(pickupLocation, user.clientId);

      if (!apiKey) {
        for (const order of pickupOrders) {
          await recordFailure(order, `No Delhivery API key configured for pickup location: ${pickupLocation}`);
        }
        continue;
      }

      let trackingResults;
      try {
        trackingResults = await delhiveryTrackingService.getBulkTrackingDetails(
          pickupOrders.map((order) => order.tracking_id!),
          apiKey
        );
      } catch (error) {
        console.error(`❌ [MANUAL_REFRESH] Tracking request failed for pickup location ${pickupLocation}:`, error);
        for (const order of pickupOrders) {
          await recordFailure(order, error instanceof Error ? error.message : 'Unknown error');
        }
        continue;
      }

      const resultsByTrackingId = new Map(
        trackingResults
          .filter((result) => result.trackingId)
          .map((result) => [result.trackingId!, result])
      );

      for (const order of pickupOrders) {
        const trackingResult = resultsByTrackingId.get(order.tracking_id!);

        if (!trackingResult?.success || !trackingResult.data) {
          await recordFailure(order, trackingResult?.error || 'No tracking result returned for this waybill');
          continue;
        }

        const rawStatus = trackingResult.data.current_status || trackingResult.data.status;
        const newStatus = delhiveryTrackingService.mapStatusToInternal(rawStatus);
        const oldStatus = order.tracking_status;

        await prisma.orders.update({
          where: { id: order.id },
          data: { tracking_status: newStatus, delhivery_api_error: null, updated_at: new Date() }
        });

        totalProcessed++;
        totalUpdated++;
        results.push({
          orderId: order.id,
          trackingId: order.tracking_id!,
          success: true,
          oldStatus: oldStatus || 'null',
          newStatus
        });
      }
    }

    console.log(`✅ [MANUAL_REFRESH] Completed: ${totalUpdated} updated, ${totalErrors} errors`);
    return NextResponse.json({
      success: true,
      message: `Manual refresh completed for ${totalProcessed} orders`,
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        timestamp: new Date().toISOString()
      },
      results
    });

  } catch (error) {
    console.error(`❌ [MANUAL_REFRESH] Fatal error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: 'Fatal error in manual refresh',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
