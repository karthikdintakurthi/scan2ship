import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = Math.random().toString(36).substring(7);
  const MAX_EXECUTION_TIME = 20000; // 20 seconds max
  
  try {
    console.log(`🔄 [CRON_TRACKING_CRITICAL_${jobId}] Starting critical tracking update job...`);
    console.log(`🕐 [CRON_TRACKING_CRITICAL_${jobId}] Start time: ${new Date().toISOString()}`);
    
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log(`🚫 [CRON_TRACKING_CRITICAL_${jobId}] Unauthorized cron request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a client-specific request
    let body;
    let specificClientId: string | null = null;
    
    try {
      body = await request.json();
      specificClientId = body.clientId || null;
    } catch (error) {
      // No body or invalid JSON, continue with all clients
    }

    // Get clients with their pickup locations
    const whereClause = specificClientId 
      ? { id: specificClientId, isActive: true }
      : { isActive: true };

    const clients = await prisma.clients.findMany({
      where: whereClause,
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

    console.log(`📊 [CRON_TRACKING_CRITICAL_${jobId}] Found ${clients.length} active clients`);

    if (specificClientId && clients.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found or inactive'
      }, { status: 404 });
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let clientsProcessed = 0;

    // Process each client with strict timeout protection
    for (const client of clients) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏰ [CRON_TRACKING_CRITICAL_${jobId}] Approaching timeout, stopping processing`);
        break;
      }

      console.log(`🏢 [CRON_TRACKING_CRITICAL_${jobId}] Processing client: ${client.companyName} (${client.id})`);
      
      // CRITICAL ORDERS ONLY: Process only orders that are most likely to have status changes
      // CRITICAL FIX: Only process Delhivery orders
      const orderWhereClause = {
        clientId: client.id,
        tracking_id: { not: null },
        courier_service: 'delhivery', // ONLY process Delhivery orders
        // Only process orders that are most likely to have updates
        OR: [
          { delhivery_tracking_status: null }, // Never been checked
          { 
            AND: [
              { delhivery_tracking_status: 'pending' },
              { created_at: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } // Created within last 7 days
            ]
          },
          { 
            AND: [
              { delhivery_tracking_status: 'manifested' },
              { created_at: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) } } // Created within last 3 days
            ]
          }
        ]
      };

      // ULTRA-LIMITED: Only process 20 orders per client maximum
      const orders = await prisma.orders.findMany({
        where: orderWhereClause,
        select: {
          id: true,
          tracking_id: true,
          delhivery_tracking_status: true,
          created_at: true
        },
        take: 20, // ULTRA-LIMITED to 20 orders
        orderBy: {
          created_at: 'asc' // Process oldest orders first
        }
      });

      console.log(`📦 [CRON_TRACKING_CRITICAL_${jobId}] Found ${orders.length} critical orders to process for client: ${client.companyName}`);

      if (orders.length === 0) {
        clientsProcessed++;
        continue;
      }

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
        // Check timeout before each API call
        if (Date.now() - startTime > MAX_EXECUTION_TIME) {
          console.log(`⏰ [CRON_TRACKING_CRITICAL_${jobId}] Timeout approaching, skipping remaining orders`);
          break;
        }

        if (clientOrders.length === 0) continue;

        console.log(`🔑 [CRON_TRACKING_CRITICAL_${jobId}] Processing ${clientOrders.length} critical orders with API key: ${apiKey.substring(0, 8)}...`);

        try {
          // Extract tracking IDs
          const trackingIds = clientOrders
            .map(order => order.tracking_id)
            .filter((id): id is string => id !== null);

          if (trackingIds.length === 0) {
            console.log(`⚠️ [CRON_TRACKING_CRITICAL_${jobId}] No valid tracking IDs found for this batch`);
            continue;
          }

          // ULTRA-SMALL BATCH: Process only 10 tracking IDs at a time
          const batchSize = 10;
          const batches = [];
          for (let i = 0; i < trackingIds.length; i += batchSize) {
            batches.push(trackingIds.slice(i, i + batchSize));
          }

          // Process each batch
          for (let i = 0; i < batches.length; i++) {
            // Check timeout before each batch
            if (Date.now() - startTime > MAX_EXECUTION_TIME) {
              console.log(`⏰ [CRON_TRACKING_CRITICAL_${jobId}] Timeout approaching, stopping batch processing`);
              break;
            }

            const batch = batches[i];
            console.log(`📦 [CRON_TRACKING_CRITICAL_${jobId}] Processing critical batch ${i + 1}/${batches.length} with ${batch.length} tracking IDs`);

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

                // Only update if status has changed
                if (order.delhivery_tracking_status !== newStatus) {
                  console.log(`📝 [CRON_TRACKING_CRITICAL_${jobId}] Updating order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
                  
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

            // MINIMAL DELAY: Only 200ms between batches
            if (i < batches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }

        } catch (error) {
          console.error(`❌ [CRON_TRACKING_CRITICAL_${jobId}] Error processing orders for client ${client.companyName}:`, error);
          totalErrors += clientOrders.length;
        }
      }

      clientsProcessed++;
      
      // MINIMAL DELAY: Only 100ms between clients
      if (clientsProcessed < clients.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: specificClientId 
        ? `Critical tracking update completed for client ${specificClientId}` 
        : 'Critical tracking update completed for all clients',
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        clientsProcessed,
        totalClients: clients.length,
        specificClient: specificClientId || null,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        timeoutPrevented: duration > MAX_EXECUTION_TIME,
        mode: 'critical',
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ [CRON_TRACKING_CRITICAL_${jobId}] Critical tracking update completed:`, result.stats);
    return NextResponse.json(result);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ [CRON_TRACKING_CRITICAL_${jobId}] Fatal error in critical tracking update:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fatal error in critical tracking update',
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
