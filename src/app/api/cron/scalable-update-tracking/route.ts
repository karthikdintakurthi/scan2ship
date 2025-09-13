import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = Math.random().toString(36).substring(7);
  const MAX_EXECUTION_TIME = 25 * 60 * 1000; // 25 minutes (Vercel limit is 30s for hobby, 15min for pro)
  
  try {
    console.log(`🔄 [SCALABLE_CRON_${jobId}] Starting scalable tracking update job...`);
    console.log(`🕐 [SCALABLE_CRON_${jobId}] Start time: ${new Date().toISOString()}`);
    
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log(`🚫 [SCALABLE_CRON_${jobId}] Unauthorized cron request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a client-specific request or batch request
    let body;
    let specificClientId: string | null = null;
    let batchNumber = 1;
    let totalBatches = 1;
    
    try {
      body = await request.json();
      specificClientId = body.clientId || null;
      batchNumber = body.batchNumber || 1;
      totalBatches = body.totalBatches || 1;
      console.log(`📦 [SCALABLE_CRON_${jobId}] Batch ${batchNumber}/${totalBatches} for client: ${specificClientId || 'All clients'}`);
    } catch (error) {
      console.log(`ℹ️ [SCALABLE_CRON_${jobId}] No body or invalid JSON, processing all clients`);
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    let clientsProcessed = 0;
    let nextBatchClients: string[] = [];

    // Get clients with pagination for batch processing
    const CLIENTS_PER_BATCH = 5; // Process 5 clients per batch to avoid timeout
    const skip = (batchNumber - 1) * CLIENTS_PER_BATCH;
    
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
      },
      skip: skip,
      take: CLIENTS_PER_BATCH,
      orderBy: { id: 'asc' } // Consistent ordering for batching
    });

    console.log(`📊 [SCALABLE_CRON_${jobId}] Processing batch ${batchNumber}/${totalBatches}: ${clients.length} clients`);

    // Process each client
    for (const client of clients) {
      // Check timeout before processing each client
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏰ [SCALABLE_CRON_${jobId}] Approaching timeout, stopping processing`);
        break;
      }

      console.log(`🏢 [SCALABLE_CRON_${jobId}] Processing client: ${client.companyName} (${client.id})`);
      
      // Get orders for this client with intelligent batching
      // Exclude orders updated within the last hour to avoid unnecessary API calls
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      console.log(`⏰ [SCALABLE_CRON_${jobId}] Excluding orders updated after: ${oneHourAgo.toISOString()}`);
      
      const orderWhereClause = {
        clientId: client.id,
        tracking_id: { not: null },
        courier_service: 'delhivery',
        updated_at: { lt: oneHourAgo }, // Only process orders not updated in the last hour
        OR: [
          { delhivery_tracking_status: null },
          { delhivery_tracking_status: 'pending' },
          { delhivery_tracking_status: 'dispatched' },
          { delhivery_tracking_status: 'manifested' },
          { delhivery_tracking_status: 'in_transit' }
        ]
      };

      // Get orders with priority-based selection
      const orders = await prisma.orders.findMany({
        where: orderWhereClause,
        select: {
          id: true,
          tracking_id: true,
          delhivery_tracking_status: true,
          created_at: true,
          updated_at: true
        },
        orderBy: [
          { updated_at: 'asc' }, // Process least recently updated first
          { created_at: 'asc' }  // Then by creation date
        ],
        take: 100 // Process 100 orders per client per batch
      });

      // Get count of total eligible orders (including recently updated ones) for comparison
      const totalEligibleOrders = await prisma.orders.count({
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

      const excludedCount = totalEligibleOrders - orders.length;
      console.log(`📦 [SCALABLE_CRON_${jobId}] Found ${orders.length} orders to process for client: ${client.companyName}`);
      console.log(`⏭️ [SCALABLE_CRON_${jobId}] Excluded ${excludedCount} orders updated within last hour (${totalEligibleOrders} total eligible)`);

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
          console.log(`⏰ [SCALABLE_CRON_${jobId}] Timeout approaching, skipping remaining orders`);
          break;
        }

        if (clientOrders.length === 0) continue;

        console.log(`🔑 [SCALABLE_CRON_${jobId}] Processing ${clientOrders.length} orders with API key: ${apiKey.substring(0, 8)}...`);

        try {
          // Extract tracking IDs
          const trackingIds = clientOrders
            .map(order => order.tracking_id)
            .filter((id): id is string => id !== null);

          if (trackingIds.length === 0) {
            console.log(`⚠️ [SCALABLE_CRON_${jobId}] No valid tracking IDs found for this batch`);
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
            // Check timeout before each batch
            if (Date.now() - startTime > MAX_EXECUTION_TIME) {
              console.log(`⏰ [SCALABLE_CRON_${jobId}] Timeout approaching, stopping batch processing`);
              break;
            }

            const batch = batches[i];
            console.log(`📦 [SCALABLE_CRON_${jobId}] Processing batch ${i + 1}/${batches.length} with ${batch.length} tracking IDs`);

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
                  console.log(`📝 [SCALABLE_CRON_${jobId}] Updating order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
                  
                  await prisma.orders.update({
                    where: { id: order.id },
                    data: {
                      delhivery_tracking_status: newStatus,
                      delhivery_api_error: null,
                      updated_at: new Date()
                    }
                  });

                  totalUpdated++;
                  console.log(`✅ [SCALABLE_CRON_${jobId}] Successfully updated order ${order.id}`);
                } else {
                  console.log(`ℹ️ [SCALABLE_CRON_${jobId}] Order ${order.id} status unchanged: ${newStatus}`);
                }
              } else {
                console.error(`❌ [SCALABLE_CRON_${jobId}] Failed to get tracking for order ${order.id}:`, {
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
              }
            }

            // Add delay between batches to be respectful to the API
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
          }

        } catch (error) {
          console.error(`❌ [SCALABLE_CRON_${jobId}] Error processing orders for client ${client.companyName}:`, error);
          totalErrors += clientOrders.length;
        }
      }

      clientsProcessed++;
      
      // Add delay between clients
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: `Batch ${batchNumber}/${totalBatches} completed`,
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        clientsProcessed,
        batchNumber,
        totalBatches,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        timestamp: new Date().toISOString(),
        hasMoreBatches: batchNumber < totalBatches
      }
    };

    console.log(`✅ [SCALABLE_CRON_${jobId}] Batch ${batchNumber}/${totalBatches} completed:`, result.stats);
    return NextResponse.json(result);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ [SCALABLE_CRON_${jobId}] Fatal error in tracking update:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fatal error in tracking update',
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