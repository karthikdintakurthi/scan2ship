import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function GET(request: NextRequest) {
  // Handle GET requests from Vercel cron jobs
  return await handleCronRequest(request, 'scheduled');
}

export async function POST(request: NextRequest) {
  // Handle POST requests (manual triggers)
  return await handleCronRequest(request, 'manual');
}

async function handleCronRequest(request: NextRequest, defaultTriggerType: 'scheduled' | 'manual') {
  const startTime = Date.now();
  const jobId = Math.random().toString(36).substring(7);
  const MAX_EXECUTION_TIME = 25000; // 25 seconds max (leaving 5s buffer for response)
  
  try {
    // Determine trigger type based on request headers and body
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    const isScheduledCron = authHeader === `Bearer ${cronSecret}`;
    
    // Check if this is a client-specific request
    let body;
    let specificClientId: string | null = null;
    let triggerType: 'scheduled' | 'manual' = defaultTriggerType;
    
    try {
      body = await request.json();
      specificClientId = body.clientId || null;
      triggerType = body.triggerType || defaultTriggerType;
    } catch (error) {
      // No body or invalid JSON, use default trigger type
      triggerType = defaultTriggerType;
    }
    
    console.log(`🔄 [CRON_TRACKING_OPT_${jobId}] Starting optimized tracking update job...`);
    console.log(`🕐 [CRON_TRACKING_OPT_${jobId}] Start time: ${new Date().toISOString()}`);
    console.log(`🎯 [CRON_TRACKING_OPT_${jobId}] Trigger type: ${triggerType.toUpperCase()}`);
    console.log(`🔐 [CRON_TRACKING_OPT_${jobId}] Auth header present: ${!!authHeader}`);
    console.log(`🌐 [CRON_TRACKING_OPT_${jobId}] Request method: ${request.method}`);
    
    // For Vercel cron jobs, we'll be more permissive with GET requests
    // For manual POST requests, require proper authorization
    if (request.method === 'POST' && !isScheduledCron && !authHeader) {
      console.log(`🚫 [CRON_TRACKING_OPT_${jobId}] Unauthorized POST request - no auth header`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (request.method === 'POST' && isScheduledCron && authHeader !== `Bearer ${cronSecret}`) {
      console.log(`🚫 [CRON_TRACKING_OPT_${jobId}] Unauthorized scheduled cron POST request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // For GET requests (Vercel cron), allow without auth header but log it
    if (request.method === 'GET' && !authHeader) {
      console.log(`⚠️ [CRON_TRACKING_OPT_${jobId}] GET request without auth header - allowing for Vercel cron`);
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

    console.log(`📊 [CRON_TRACKING_OPT_${jobId}] Found ${clients.length} active clients`);

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

    // Process each client with timeout protection
    for (const client of clients) {
      // Check if we're approaching timeout
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.log(`⏰ [CRON_TRACKING_OPT_${jobId}] Approaching timeout, stopping processing`);
        break;
      }

      console.log(`🏢 [CRON_TRACKING_OPT_${jobId}] Processing client: ${client.companyName} (${client.id})`);
      
      // Get orders with stricter limits for timeout prevention
      // CRITICAL FIX: Only process Delhivery orders
      const orderWhereClause = {
        clientId: client.id,
        tracking_id: { not: null },
        courier_service: 'delhivery', // ONLY process Delhivery orders
        OR: [
          { delhivery_tracking_status: null },
          { delhivery_tracking_status: 'pending' },
          { delhivery_tracking_status: 'dispatched' },
          { delhivery_tracking_status: 'manifested' },
          { delhivery_tracking_status: 'in_transit' }
        ]
      };

      // INCREASED LIMIT: Process 50 orders per client per minute for better throughput
      // EXCLUDE recently processed orders to avoid duplicates
      const recentlyProcessedCutoff = new Date(Date.now() - 1 * 60 * 1000); // 1 minute ago
      
      // First, get a larger pool of orders to choose from
      const allEligibleOrders = await prisma.orders.findMany({
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
        },
        select: {
          id: true,
          tracking_id: true,
          delhivery_tracking_status: true,
          created_at: true,
          updated_at: true
        },
        orderBy: [
          { updated_at: 'asc' }, // Process least recently updated orders first
          { created_at: 'asc' }  // Then by creation date
        ]
      });

      // Filter out recently processed orders (within last 1 minute)
      const recentlyProcessed = allEligibleOrders.filter(order => 
        order.updated_at && order.updated_at > recentlyProcessedCutoff
      );

      // Take the next batch of unprocessed orders
      const orders = allEligibleOrders
        .filter(order => !recentlyProcessed.some(recent => recent.id === order.id))
        .slice(0, 50); // Take 50 orders per client per minute

      console.log(`📦 [CRON_TRACKING_OPT_${jobId}] Found ${orders.length} orders to process for client: ${client.companyName}`);
      console.log(`📊 [CRON_TRACKING_OPT_${jobId}] Total eligible: ${allEligibleOrders.length}, Recently processed: ${recentlyProcessed.length}, Selected: ${orders.length}`);

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
          console.log(`⏰ [CRON_TRACKING_OPT_${jobId}] Timeout approaching, skipping remaining orders`);
          break;
        }

        if (clientOrders.length === 0) continue;

        console.log(`🔑 [CRON_TRACKING_OPT_${jobId}] Processing ${clientOrders.length} orders with API key: ${apiKey.substring(0, 8)}...`);

        try {
          // Extract tracking IDs
          const trackingIds = clientOrders
            .map(order => order.tracking_id)
            .filter((id): id is string => id !== null);

          if (trackingIds.length === 0) {
            console.log(`⚠️ [CRON_TRACKING_OPT_${jobId}] No valid tracking IDs found for this batch`);
            continue;
          }

          // INCREASED BATCH SIZE: Process 50 tracking IDs at a time for better efficiency
          const batchSize = 50;
          const batches = [];
          for (let i = 0; i < trackingIds.length; i += batchSize) {
            batches.push(trackingIds.slice(i, i + batchSize));
          }

          // Process each batch
          for (let i = 0; i < batches.length; i++) {
            // Check timeout before each batch
            if (Date.now() - startTime > MAX_EXECUTION_TIME) {
              console.log(`⏰ [CRON_TRACKING_OPT_${jobId}] Timeout approaching, stopping batch processing`);
              break;
            }

            const batch = batches[i];
            console.log(`📦 [CRON_TRACKING_OPT_${jobId}] Processing batch ${i + 1}/${batches.length} with ${batch.length} tracking IDs`);

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

                // Always update the order to mark it as processed (even if status didn't change)
                if (order.delhivery_tracking_status !== newStatus) {
                  console.log(`📝 [CRON_TRACKING_OPT_${jobId}] Updating order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
                  
                  await prisma.orders.update({
                    where: { id: order.id },
                    data: {
                      delhivery_tracking_status: newStatus,
                      delhivery_api_error: null,
                      updated_at: new Date()
                    }
                  });

                  totalUpdated++;
                } else {
                  // Status didn't change, but still update the timestamp to mark as processed
                  console.log(`🔄 [CRON_TRACKING_OPT_${jobId}] Order ${order.id} status unchanged (${newStatus}), updating timestamp`);
                  
                  await prisma.orders.update({
                    where: { id: order.id },
                    data: {
                      updated_at: new Date()
                    }
                  });
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

            // REDUCED DELAY: Only 500ms between batches instead of 2 seconds
            if (i < batches.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          }

        } catch (error) {
          console.error(`❌ [CRON_TRACKING_OPT_${jobId}] Error processing orders for client ${client.companyName}:`, error);
          totalErrors += clientOrders.length;
        }
      }

      clientsProcessed++;
      
      // REDUCED DELAY: Only 200ms between clients instead of 1 second
      if (clientsProcessed < clients.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: specificClientId 
        ? `Optimized tracking update completed for client ${specificClientId}` 
        : 'Optimized tracking update completed for all clients',
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        clientsProcessed,
        totalClients: clients.length,
        specificClient: specificClientId || null,
        triggerType: triggerType,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        timeoutPrevented: duration > MAX_EXECUTION_TIME,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ [CRON_TRACKING_OPT_${jobId}] Optimized tracking update completed (${triggerType.toUpperCase()}):`, result.stats);
    return NextResponse.json(result);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ [CRON_TRACKING_OPT_${jobId}] Fatal error in optimized tracking update:`, error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Fatal error in optimized tracking update',
        message: error instanceof Error ? error.message : 'Unknown error',
        jobId,
        durationMs: duration
      }, 
      { status: 500 }
    );
  }
}
