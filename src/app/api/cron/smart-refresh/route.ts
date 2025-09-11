import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = Math.random().toString(36).substring(7);
  const MAX_EXECUTION_TIME = 25000; // 25 seconds max per call
  
  try {
    console.log(`🔄 [SMART_REFRESH_${jobId}] Starting smart refresh job...`);
    console.log(`🕐 [SMART_REFRESH_${jobId}] Start time: ${new Date().toISOString()}`);
    
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log(`🚫 [SMART_REFRESH_${jobId}] Unauthorized request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get client ID from request body
    let body;
    let clientId: string | null = null;
    
    try {
      body = await request.json();
      clientId = body.clientId || null;
    } catch (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid request body. clientId is required.' 
      }, { status: 400 });
    }

    if (!clientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'clientId is required' 
      }, { status: 400 });
    }

    // Get client information
    const client = await prisma.clients.findFirst({
      where: { id: clientId, isActive: true },
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
    });

    if (!client) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found or inactive' 
      }, { status: 404 });
    }

    console.log(`🏢 [SMART_REFRESH_${jobId}] Processing client: ${client.companyName} (${client.id})`);

    // Count total orders that need processing
    const totalOrdersCount = await prisma.orders.count({
      where: {
        clientId: client.id,
        tracking_id: { not: null },
        courier_service: 'delhivery',
        OR: [
          { delhivery_tracking_status: null },
          { delhivery_tracking_status: 'pending' },
          { delhivery_tracking_status: 'dispatched' },
          { delhivery_tracking_status: 'manifested' },
          { delhivery_tracking_status: 'in_transit' }
        ]
      }
    });

    console.log(`📊 [SMART_REFRESH_${jobId}] Total orders to process: ${totalOrdersCount}`);

    if (totalOrdersCount === 0) {
      return NextResponse.json({
        success: true,
        message: 'No orders need processing',
        stats: {
          totalOrders: 0,
          processedOrders: 0,
          updatedOrders: 0,
          errors: 0,
          callsMade: 0,
          durationMs: Date.now() - startTime
        }
      });
    }

    // Calculate optimal batch size and number of calls needed
    const BATCH_SIZE = 25; // Smaller batches for better reliability
    const totalCallsNeeded = Math.ceil(totalOrdersCount / BATCH_SIZE);
    
    console.log(`📦 [SMART_REFRESH_${jobId}] Will make ${totalCallsNeeded} calls with batch size ${BATCH_SIZE}`);

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let callsMade = 0;
    let processedOrderIds = new Set<number>();

    // Process orders in batches
    for (let callNumber = 1; callNumber <= totalCallsNeeded; callNumber++) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏰ [SMART_REFRESH_${jobId}] Approaching timeout, stopping at call ${callNumber}/${totalCallsNeeded}`);
        break;
      }

      console.log(`🔄 [SMART_REFRESH_${jobId}] Making call ${callNumber}/${totalCallsNeeded}`);

      // Get orders for this batch (excluding already processed ones)
      const orders = await prisma.orders.findMany({
        where: {
          clientId: client.id,
          tracking_id: { not: null },
          courier_service: 'delhivery',
          id: { notIn: Array.from(processedOrderIds) }, // Exclude already processed
          OR: [
            { delhivery_tracking_status: null },
            { delhivery_tracking_status: 'pending' },
            { delhivery_tracking_status: 'dispatched' },
            { delhivery_tracking_status: 'manifested' },
            { delhivery_tracking_status: 'in_transit' }
          ]
        },
        select: {
          id: true,
          tracking_id: true,
          delhivery_tracking_status: true,
          created_at: true
        },
        take: BATCH_SIZE,
        orderBy: {
          created_at: 'asc' // Process oldest orders first
        }
      });

      if (orders.length === 0) {
        console.log(`ℹ️ [SMART_REFRESH_${jobId}] No more orders to process in call ${callNumber}`);
        break;
      }

      console.log(`📦 [SMART_REFRESH_${jobId}] Processing ${orders.length} orders in call ${callNumber}`);

      // Group orders by pickup location (API key)
      const ordersByLocation = new Map<string, typeof orders>();
      
      for (const order of orders) {
        const pickupLocation = client.pickup_locations.find(loc => 
          loc.delhiveryApiKey && loc.delhiveryApiKey.trim() !== ''
        );
        
        if (pickupLocation) {
          const key = pickupLocation.delhiveryApiKey;
          if (!ordersByLocation.has(key)) {
            ordersByLocation.set(key, []);
          }
          ordersByLocation.get(key)!.push(order);
        }
      }

      // Process orders for each pickup location
      for (const [apiKey, clientOrders] of ordersByLocation) {
        if (clientOrders.length === 0) continue;

        try {
          // Extract tracking IDs
          const trackingIds = clientOrders
            .map(order => order.tracking_id)
            .filter((id): id is string => id !== null);

          if (trackingIds.length === 0) continue;

          console.log(`🔑 [SMART_REFRESH_${jobId}] Processing ${trackingIds.length} orders with API key: ${apiKey.substring(0, 8)}...`);

          // Fetch tracking details from Delhivery
          const trackingResults = await delhiveryTrackingService.getBulkTrackingDetails(trackingIds, apiKey);
          
          // Update orders based on tracking results
          for (let i = 0; i < clientOrders.length && i < trackingResults.length; i++) {
            const order = clientOrders[i];
            const trackingResult = trackingResults[i];

            totalProcessed++;
            processedOrderIds.add(order.id);

            if (trackingResult.success && trackingResult.data) {
              const rawStatus = trackingResult.data.current_status || trackingResult.data.status;
              const newStatus = delhiveryTrackingService.mapStatusToInternal(rawStatus);

              // Only update if status has changed
              if (order.delhivery_tracking_status !== newStatus) {
                console.log(`📝 [SMART_REFRESH_${jobId}] Updating order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
                
                await prisma.orders.update({
                  where: { id: order.id },
                  data: {
                    delhivery_tracking_status: newStatus,
                    delhivery_api_error: null,
                    updated_at: new Date()
                  }
                });

                totalUpdated++;
              }
            } else {
              // Update order with error status
              await prisma.orders.update({
                where: { id: order.id },
                data: {
                  delhivery_api_error: trackingResult.error || 'Unknown error',
                  updated_at: new Date()
                }
              });

              totalErrors++;
            }
          }

        } catch (error) {
          console.error(`❌ [SMART_REFRESH_${jobId}] Error processing orders in call ${callNumber}:`, error);
          totalErrors += clientOrders.length;
          
          // Mark orders as processed even if they failed
          clientOrders.forEach(order => {
            processedOrderIds.add(order.id);
            totalProcessed++;
          });
        }
      }

      callsMade++;
      
      // Add delay between calls to prevent overwhelming the API
      if (callNumber < totalCallsNeeded) {
        console.log(`⏳ [SMART_REFRESH_${jobId}] Waiting 1 second before next call...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: `Smart refresh completed for ${client.companyName}`,
      stats: {
        totalOrders: totalOrdersCount,
        processedOrders: totalProcessed,
        updatedOrders: totalUpdated,
        errors: totalErrors,
        callsMade: callsMade,
        totalCallsNeeded: totalCallsNeeded,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        clientId: client.id,
        clientName: client.companyName,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ [SMART_REFRESH_${jobId}] Smart refresh completed:`, result.stats);
    return NextResponse.json(result);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ [SMART_REFRESH_${jobId}] Fatal error in smart refresh:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fatal error in smart refresh',
        message: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        durationMs: duration
      }, 
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
