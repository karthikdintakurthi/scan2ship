import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';
import { getAuthenticatedUser } from '@/lib/auth-middleware';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { orderIds } = await request.json();

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json({ 
        error: 'Order IDs array is required and must not be empty' 
      }, { status: 400 });
    }

    if (orderIds.length > 100) {
      return NextResponse.json({ 
        error: 'Cannot refresh more than 100 orders at once' 
      }, { status: 400 });
    }

    console.log(`🔄 [MANUAL_REFRESH] Starting manual status refresh for ${orderIds.length} orders`);

    // Get orders with their pickup locations and API keys
    const orders = await prisma.orders.findMany({
      where: {
        id: { in: orderIds },
        tracking_id: { not: null },
        courier_service: 'delhivery'
      },
      include: {
        clients: {
          include: {
            pickup_locations: {
              select: {
                id: true,
                value: true,
                label: true,
                delhiveryApiKey: true
              }
            }
          }
        }
      }
    });

    if (orders.length === 0) {
      return NextResponse.json({ 
        error: 'No valid Delhivery orders found with tracking IDs' 
      }, { status: 404 });
    }

    console.log(`📦 [MANUAL_REFRESH] Found ${orders.length} valid orders to refresh`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    const results: Array<{
      orderId: number;
      trackingId: string;
      success: boolean;
      oldStatus?: string;
      newStatus?: string;
      error?: string;
    }> = [];

    // Group orders by API key (pickup location)
    const ordersByApiKey = new Map<string, typeof orders>();
    
    for (const order of orders) {
      const pickupLocation = order.clients.pickup_locations.find(loc => 
        loc.delhiveryApiKey && loc.delhiveryApiKey.trim() !== ''
      );
      
      if (pickupLocation) {
        const apiKey = pickupLocation.delhiveryApiKey;
        if (!ordersByApiKey.has(apiKey)) {
          ordersByApiKey.set(apiKey, []);
        }
        ordersByApiKey.get(apiKey)!.push(order);
      }
    }

    // Process orders for each API key
    for (const [apiKey, clientOrders] of ordersByApiKey) {
      console.log(`🔑 [MANUAL_REFRESH] Processing ${clientOrders.length} orders with API key: ${apiKey.substring(0, 8)}...`);

      try {
        // Extract tracking IDs
        const trackingIds = clientOrders
          .map(order => order.tracking_id)
          .filter((id): id is string => id !== null);

        if (trackingIds.length === 0) {
          console.log(`⚠️ [MANUAL_REFRESH] No valid tracking IDs found for this batch`);
          continue;
        }

        // Process in batches of 50 (Delhivery API limit)
        const batchSize = 50;
        const batches = [];
        for (let i = 0; i < trackingIds.length; i += batchSize) {
          batches.push(trackingIds.slice(i, i + batchSize));
        }

        // Process each batch
        for (let i = 0; i < batches.length; i++) {
          const batch = trackingIds.slice(i * batchSize, (i + 1) * batchSize);
          console.log(`📦 [MANUAL_REFRESH] Processing batch ${i + 1}/${batches.length} with ${batch.length} tracking IDs`);

          // Fetch tracking details from Delhivery
          const trackingResults = await delhiveryTrackingService.getBulkTrackingDetails(batch, apiKey);
          
          // Update orders based on tracking results
          for (let j = 0; j < clientOrders.length && j < trackingResults.length; j++) {
            const order = clientOrders[j];
            const trackingResult = trackingResults[j];

            totalProcessed++;

            if (trackingResult.success && trackingResult.data) {
              const rawStatus = trackingResult.data.current_status || trackingResult.data.status;
              const newStatus = delhiveryTrackingService.mapStatusToInternal(rawStatus);
              const oldStatus = order.delhivery_tracking_status;

              // Always update regardless of status change (manual refresh)
              console.log(`📝 [MANUAL_REFRESH] Updating order ${order.id}: ${oldStatus || 'null'} → ${newStatus}`);
              
              await prisma.orders.update({
                where: { id: order.id },
                data: {
                  delhivery_tracking_status: newStatus,
                  delhivery_api_error: null,
                  updated_at: new Date()
                }
              });

              totalUpdated++;
              results.push({
                orderId: order.id,
                trackingId: order.tracking_id!,
                success: true,
                oldStatus: oldStatus || 'null',
                newStatus: newStatus
              });

              console.log(`✅ [MANUAL_REFRESH] Successfully updated order ${order.id}`);
            } else {
              console.error(`❌ [MANUAL_REFRESH] Failed to get tracking for order ${order.id}:`, {
                error: trackingResult.error,
                trackingId: order.tracking_id
              });
              
              // Update order with error status
              await prisma.orders.update({
                where: { id: order.id },
                data: {
                  delhivery_api_error: trackingResult.error || 'Unknown error',
                  updated_at: new Date()
                }
              });

              totalErrors++;
              results.push({
                orderId: order.id,
                trackingId: order.tracking_id!,
                success: false,
                error: trackingResult.error || 'Unknown error'
              });
            }
          }

          // Add delay between batches to be respectful to the API
          if (i < batches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }
        }

      } catch (error) {
        console.error(`❌ [MANUAL_REFRESH] Error processing orders for API key ${apiKey.substring(0, 8)}:`, error);
        
        // Mark all orders in this batch as failed
        for (const order of clientOrders) {
          totalErrors++;
          results.push({
            orderId: order.id,
            trackingId: order.tracking_id!,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const response = {
      success: true,
      message: `Manual refresh completed for ${totalProcessed} orders`,
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        timestamp: new Date().toISOString()
      },
      results
    };

    console.log(`✅ [MANUAL_REFRESH] Completed: ${totalUpdated} updated, ${totalErrors} errors`);
    return NextResponse.json(response);

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
