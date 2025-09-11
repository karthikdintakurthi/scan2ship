import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 [TEST_TRACKING] Starting test tracking update...');
    
    // Get a sample of orders to test with (limit to 5 for testing)
    const orders = await prisma.orders.findMany({
      where: {
        tracking_id: { not: null },
        // Only test orders that are not in final states
        OR: [
          { delhivery_api_status: { not: 'delivered' } },
          { delhivery_api_status: null },
          { delhivery_api_status: 'pending' },
          { delhivery_api_status: 'dispatched' }
        ],
        AND: [
          { delhivery_api_status: { not: 'delivered' } },
          { delhivery_api_status: { not: 'returned' } },
          { delhivery_api_status: { not: 'failed' } }
        ]
      },
      include: {
        clients: {
          include: {
            pickup_locations: {
              where: { isActive: true },
              select: {
                delhivery_api_key: true
              }
            }
          }
        }
      },
      take: 5 // Limit to 5 orders for testing
    });

    if (orders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders found for testing',
        stats: { totalProcessed: 0, totalUpdated: 0, totalErrors: 0 }
      });
    }

    console.log(`🧪 [TEST_TRACKING] Found ${orders.length} orders for testing`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Process each order
    for (const order of orders) {
      totalProcessed++;
      
      // Find API key for this order
      const pickupLocation = order.clients.pickup_locations.find(loc => 
        loc.delhivery_api_key && loc.delhivery_api_key.trim() !== ''
      );

      if (!pickupLocation) {
        console.log(`⚠️ [TEST_TRACKING] No API key found for order ${order.id}`);
        totalErrors++;
        continue;
      }

      try {
        console.log(`🔍 [TEST_TRACKING] Testing order ${order.id} with tracking ID: ${order.tracking_id}`);
        
        // Fetch tracking details
        const trackingResult = await delhiveryTrackingService.getTrackingDetails(
          order.tracking_id!,
          pickupLocation.delhivery_api_key
        );

        if (trackingResult.success && trackingResult.data) {
          const newStatus = delhiveryTrackingService.mapStatusToInternal(
            trackingResult.data.current_status || trackingResult.data.status
          );

          // Update order
          await prisma.orders.update({
            where: { id: order.id },
            data: {
              delhivery_api_status: newStatus,
              delhivery_api_error: null,
              updated_at: new Date()
            }
          });

          totalUpdated++;
          console.log(`✅ [TEST_TRACKING] Updated order ${order.id}: ${order.delhivery_api_status} → ${newStatus}`);
        } else {
          console.error(`❌ [TEST_TRACKING] Failed to get tracking for order ${order.id}: ${trackingResult.error}`);
          
          await prisma.orders.update({
            where: { id: order.id },
            data: {
              delhivery_api_error: trackingResult.error || 'Unknown error',
              updated_at: new Date()
            }
          });

          totalErrors++;
        }
      } catch (error) {
        console.error(`❌ [TEST_TRACKING] Error processing order ${order.id}:`, error);
        totalErrors++;
      }

      // Add delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const result = {
      success: true,
      message: 'Test tracking update completed',
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        ordersTested: orders.length,
        timestamp: new Date().toISOString()
      }
    };

    console.log('✅ [TEST_TRACKING] Test completed:', result.stats);
    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [TEST_TRACKING] Fatal error in test tracking:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fatal error in test tracking',
        message: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
