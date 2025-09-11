import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const jobId = Math.random().toString(36).substring(7);
  
  try {
    console.log(`🔄 [CRON_TRACKING_${jobId}] Starting tracking update job...`);
    console.log(`🕐 [CRON_TRACKING_${jobId}] Start time: ${new Date().toISOString()}`);
    
    // Verify this is a legitimate cron request (you can add additional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-cron-secret';
    
    console.log(`🔐 [CRON_TRACKING_${jobId}] Auth header present: ${!!authHeader}`);
    console.log(`🔐 [CRON_TRACKING_${jobId}] Expected secret: ${cronSecret.substring(0, 8)}...`);
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log(`🚫 [CRON_TRACKING_${jobId}] Unauthorized cron request`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if this is a client-specific request
    let body;
    let specificClientId: string | null = null;
    
    try {
      body = await request.json();
      specificClientId = body.clientId || null;
      console.log(`📦 [CRON_TRACKING_${jobId}] Request body:`, JSON.stringify(body, null, 2));
      console.log(`🎯 [CRON_TRACKING_${jobId}] Specific client ID: ${specificClientId || 'None (processing all clients)'}`);
    } catch (error) {
      // No body or invalid JSON, continue with all clients
      console.log(`ℹ️ [CRON_TRACKING_${jobId}] No body or invalid JSON, processing all clients`);
      console.log(`ℹ️ [CRON_TRACKING_${jobId}] Error parsing body:`, error instanceof Error ? error.message : 'Unknown error');
    }

    // Get clients with their pickup locations
    const whereClause = specificClientId 
      ? { id: specificClientId, isActive: true }
      : { isActive: true };

    console.log(`🔍 [CRON_TRACKING_${jobId}] Database query where clause:`, JSON.stringify(whereClause, null, 2));

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

    console.log(`📊 [CRON_TRACKING_${jobId}] Found ${clients.length} active clients${specificClientId ? ` (specific client: ${specificClientId})` : ''}`);
    console.log(`📋 [CRON_TRACKING_${jobId}] Clients data:`, clients.map(client => ({
      id: client.id,
      companyName: client.companyName,
      pickupLocationsCount: client.pickup_locations.length,
      hasApiKeys: client.pickup_locations.some(loc => loc.delhiveryApiKey)
    })));

    if (specificClientId && clients.length === 0) {
      console.log(`❌ [CRON_TRACKING_${jobId}] Client not found or inactive: ${specificClientId}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Client not found or inactive',
        message: `Client with ID ${specificClientId} not found or is inactive`
      }, { status: 404 });
    }

    let totalProcessed = 0;
    let totalUpdated = 0;
    let totalErrors = 0;

    // Process each client
    for (const client of clients) {
      console.log(`🏢 [CRON_TRACKING_${jobId}] Processing client: ${client.companyName} (${client.id})`);
      console.log(`📍 [CRON_TRACKING_${jobId}] Client pickup locations:`, client.pickup_locations.map(loc => ({
        id: loc.id,
        label: loc.label,
        hasApiKey: !!loc.delhiveryApiKey,
        apiKeyPreview: loc.delhiveryApiKey ? `${loc.delhiveryApiKey.substring(0, 8)}...` : 'None'
      })));
      
      // Get all non-final orders for this client
      // CRITICAL FIX: Only process Delhivery orders
      const orderWhereClause = {
        clientId: client.id,
        tracking_id: { not: null },
        courier_service: 'delhivery', // ONLY process Delhivery orders
        // Process orders that are not in final states (delivered, returned, failed)
        OR: [
          { delhivery_tracking_status: null }, // No tracking status set yet
          { delhivery_tracking_status: 'pending' },
          { delhivery_tracking_status: 'dispatched' },
          { delhivery_tracking_status: 'manifested' },
          { delhivery_tracking_status: 'in_transit' }
        ]
      };

      console.log(`🔍 [CRON_TRACKING_${jobId}] Order query where clause:`, JSON.stringify(orderWhereClause, null, 2));

      const orders = await prisma.orders.findMany({
        where: orderWhereClause,
        select: {
          id: true,
          tracking_id: true,
          delhivery_tracking_status: true,
          created_at: true
        },
        take: 200 // Limit to 200 orders per client per run (4 batches of 50 waybills each)
      });

      console.log(`📦 [CRON_TRACKING_${jobId}] Found ${orders.length} orders to process for client: ${client.companyName}`);
      console.log(`📋 [CRON_TRACKING_${jobId}] Sample orders:`, orders.slice(0, 3).map(order => ({
        id: order.id,
        tracking_id: order.tracking_id,
        current_status: order.delhivery_tracking_status
      })));

      if (orders.length === 0) {
        console.log(`ℹ️ [CRON_TRACKING_${jobId}] No orders to process for client: ${client.companyName}`);
        continue;
      }

      // Group orders by pickup location (API key)
      const ordersByLocation = new Map<string, typeof orders>();
      
      for (const order of orders) {
        // Find the pickup location for this order
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

        console.log(`🔑 [CRON_TRACKING_${jobId}] Processing ${clientOrders.length} orders with API key: ${apiKey.substring(0, 8)}...`);

        try {
          // Extract tracking IDs
          const trackingIds = clientOrders
            .map(order => order.tracking_id)
            .filter((id): id is string => id !== null);

          console.log(`📋 [CRON_TRACKING_${jobId}] Tracking IDs to process:`, trackingIds.slice(0, 5), trackingIds.length > 5 ? `... and ${trackingIds.length - 5} more` : '');

          if (trackingIds.length === 0) {
            console.log(`⚠️ [CRON_TRACKING_${jobId}] No valid tracking IDs found for this batch`);
            continue;
          }

          console.log(`🌐 [CRON_TRACKING_${jobId}] Calling Delhivery API with ${trackingIds.length} tracking IDs...`);
          console.log(`🔗 [CRON_TRACKING_${jobId}] API URL: https://track.delhivery.com/api/v1/packages/json/?waybill=${trackingIds.join(',')}`);
          console.log(`🔑 [CRON_TRACKING_${jobId}] API Key: ${apiKey.substring(0, 8)}...`);

          // Fetch tracking details from Delhivery
          const trackingResults = await delhiveryTrackingService.getBulkTrackingDetails(trackingIds, apiKey);
          
          console.log(`📊 [CRON_TRACKING_${jobId}] Delhivery API response received:`, {
            resultsCount: trackingResults.length,
            successCount: trackingResults.filter(r => r.success).length,
            errorCount: trackingResults.filter(r => !r.success).length
          });

          // Update orders based on tracking results
          for (let i = 0; i < clientOrders.length; i++) {
            const order = clientOrders[i];
            const trackingResult = trackingResults[i];

            totalProcessed++;

            console.log(`🔄 [CRON_TRACKING_${jobId}] Processing order ${order.id} (${order.tracking_id}):`, {
              currentStatus: order.delhivery_api_status,
              trackingResultSuccess: trackingResult.success,
              trackingData: trackingResult.data ? {
                status: trackingResult.data.status,
                current_status: trackingResult.data.current_status,
                status_description: trackingResult.data.status_description
              } : null,
              error: trackingResult.error
            });

            if (trackingResult.success && trackingResult.data) {
              const rawStatus = trackingResult.data.current_status || trackingResult.data.status;
              const newStatus = delhiveryTrackingService.mapStatusToInternal(rawStatus);

              console.log(`🔄 [CRON_TRACKING_${jobId}] Status mapping: "${rawStatus}" → "${newStatus}"`);

              // Only update if status has changed
              if (order.delhivery_tracking_status !== newStatus) {
                console.log(`📝 [CRON_TRACKING_${jobId}] Updating order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
                
                await prisma.orders.update({
                  where: { id: order.id },
                  data: {
                    delhivery_tracking_status: newStatus,
                    delhivery_api_error: null, // Clear any previous errors
                    updated_at: new Date()
                  }
                });

                totalUpdated++;
                console.log(`✅ [CRON_TRACKING_${jobId}] Successfully updated order ${order.id}: ${order.delhivery_tracking_status} → ${newStatus}`);
              } else {
                console.log(`ℹ️ [CRON_TRACKING_${jobId}] Order ${order.id} status unchanged: ${newStatus}`);
              }

              // If this is a final status, we won't process it again
              if (delhiveryTrackingService.isFinalStatus(newStatus)) {
                console.log(`🏁 [CRON_TRACKING_${jobId}] Order ${order.id} reached final status: ${newStatus}`);
              }
            } else {
              // Log error but don't fail the entire batch
              console.error(`❌ [CRON_TRACKING_${jobId}] Failed to get tracking for order ${order.id}:`, {
                error: trackingResult.error,
                trackingId: order.tracking_id,
                apiKey: apiKey.substring(0, 8) + '...'
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

          // Add delay between API calls to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay

        } catch (error) {
          console.error(`❌ [CRON_TRACKING_${jobId}] Error processing orders for client ${client.companyName}:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            clientId: client.id,
            ordersCount: clientOrders.length,
            apiKey: apiKey.substring(0, 8) + '...'
          });
          totalErrors += clientOrders.length;
        }
      }

      // Add delay between clients
      console.log(`⏳ [CRON_TRACKING_${jobId}] Waiting 1 second before processing next client...`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
    }

    const endTime = Date.now();
    const duration = endTime - startTime;

    const result = {
      success: true,
      message: specificClientId 
        ? `Tracking update completed for client ${specificClientId}` 
        : 'Tracking update completed for all clients',
      stats: {
        totalProcessed,
        totalUpdated,
        totalErrors,
        clientsProcessed: clients.length,
        specificClient: specificClientId || null,
        durationMs: duration,
        durationSeconds: Math.round(duration / 1000),
        timestamp: new Date().toISOString()
      }
    };

    console.log(`✅ [CRON_TRACKING_${jobId}] Tracking update completed:`, result.stats);
    console.log(`⏱️ [CRON_TRACKING_${jobId}] Total execution time: ${duration}ms (${Math.round(duration / 1000)}s)`);
    return NextResponse.json(result);

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.error(`❌ [CRON_TRACKING_${jobId}] Fatal error in tracking update:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      durationMs: duration,
      timestamp: new Date().toISOString()
    });
    
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
