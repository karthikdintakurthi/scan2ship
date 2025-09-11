interface DelhiveryTrackingResponse {
  success: boolean;
  data?: {
    tracking_id: string;
    status: string;
    status_description: string;
    current_status: string;
    current_status_description: string;
    delivered_date?: string;
    delivered_to?: string;
    remarks?: string;
  };
  error?: string;
}

interface TrackingUpdate {
  orderId: number;
  trackingId: string;
  status: string;
  statusDescription: string;
  deliveredDate?: string;
  deliveredTo?: string;
  remarks?: string;
}

export class DelhiveryTrackingService {
  private baseUrl = 'https://track.delhivery.com';

  /**
   * Fetch tracking details for a single order
   */
  async getTrackingDetails(trackingId: string, apiKey: string): Promise<DelhiveryTrackingResponse> {
    try {
      // Use the correct Delhivery API endpoint format
      const url = `${this.baseUrl}/api/v1/packages/json/?waybill=${trackingId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${apiKey}`, // Use proper Authorization header format
        },
        // Add timeout
        signal: AbortSignal.timeout(30000) // 30 seconds timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle Delhivery API response format
      // The API can return data in different formats depending on the response
      if (data && (data.data || data.packages)) {
        const trackingData = data.data?.[0] || data.packages?.[0] || data;
        
        // Extract status information from various possible fields
        const status = trackingData.status || 
                     trackingData.current_status || 
                     trackingData.shipment_status ||
                     trackingData.delivery_status ||
                     'Unknown';
        
        const statusDescription = trackingData.status_description || 
                                trackingData.current_status_description ||
                                trackingData.shipment_status_description ||
                                trackingData.delivery_status_description ||
                                'Status unknown';
        
        return {
          success: true,
          data: {
            tracking_id: trackingData.tracking_id || trackingData.waybill || trackingId,
            status: status,
            status_description: statusDescription,
            current_status: status,
            current_status_description: statusDescription,
            delivered_date: trackingData.delivered_date || trackingData.delivery_date,
            delivered_to: trackingData.delivered_to || trackingData.consignee_name,
            remarks: trackingData.remarks || trackingData.comments
          }
        };
      } else if (data.error || data.message) {
        return {
          success: false,
          error: data.error || data.message || 'API returned an error'
        };
      } else {
        return {
          success: false,
          error: 'No tracking data found in response'
        };
      }
    } catch (error) {
      console.error('❌ [DELHIVERY_TRACKING] Error fetching tracking details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Fetch tracking details for multiple orders
   */
  async getBulkTrackingDetails(trackingIds: string[], apiKey: string): Promise<DelhiveryTrackingResponse[]> {
    const results: DelhiveryTrackingResponse[] = [];
    const batchId = Math.random().toString(36).substring(7);
    
    console.log(`🔄 [DELHIVERY_BULK_${batchId}] Starting bulk tracking request for ${trackingIds.length} tracking IDs`);
    console.log(`🔑 [DELHIVERY_BULK_${batchId}] API Key: ${apiKey.substring(0, 8)}...`);
    
    // Process in batches of 50 (Delhivery API supports up to 50 waybills per call)
    const batchSize = 50;
    for (let i = 0; i < trackingIds.length; i += batchSize) {
      const batch = trackingIds.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(trackingIds.length / batchSize);
      
      console.log(`📦 [DELHIVERY_BULK_${batchId}] Processing batch ${batchNumber}/${totalBatches} with ${batch.length} tracking IDs`);
      
      try {
        // Use the correct Delhivery API endpoint format for bulk requests
        const url = `${this.baseUrl}/api/v1/packages/json/?waybill=${batch.join(',')}`;
        
        console.log(`🌐 [DELHIVERY_BULK_${batchId}] API URL: ${url}`);
        console.log(`📋 [DELHIVERY_BULK_${batchId}] Tracking IDs in this batch:`, batch);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${apiKey}`, // Use proper Authorization header format
          },
          signal: AbortSignal.timeout(60000) // 60 seconds timeout for bulk requests
        });
        
        console.log(`📊 [DELHIVERY_BULK_${batchId}] Response status: ${response.status} ${response.statusText}`);
        console.log(`📊 [DELHIVERY_BULK_${batchId}] Response headers:`, Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorText = await response.text();
          console.log(`❌ [DELHIVERY_BULK_${batchId}] API Error Response:`, errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`📄 [DELHIVERY_BULK_${batchId}] Raw API Response:`, JSON.stringify(data, null, 2));
        
        // Handle Delhivery API response format for bulk requests
        if (data && data.ShipmentData && Array.isArray(data.ShipmentData)) {
          console.log(`📦 [DELHIVERY_BULK_${batchId}] Processing ${data.ShipmentData.length} shipments from ShipmentData array`);
          
          // Process each shipment result
          for (const shipmentWrapper of data.ShipmentData) {
            if (!shipmentWrapper.Shipment) {
              console.log(`⚠️ [DELHIVERY_BULK_${batchId}] Skipping invalid shipment data:`, shipmentWrapper);
              continue;
            }
            
            const shipment = shipmentWrapper.Shipment;
            
            // Extract status information from the shipment
            const status = shipment.Status?.Status || 'Unknown';
            const statusDescription = shipment.Status?.Instructions || 'Status unknown';
            
            // Use the proper status mapping function
            let finalStatus = this.mapStatusToInternal(status);
            
            // Additional check: If status is generic "success" but we have DeliveryDate, override to delivered
            if ((status === 'success' || status === 'Success') && shipment.DeliveryDate) {
              console.log(`📦 [DELHIVERY_BULK_${batchId}] Overriding status to 'delivered' due to DeliveryDate: ${shipment.DeliveryDate}`);
              finalStatus = 'delivered';
            }
            
            const processedResult = {
              success: true,
              data: {
                tracking_id: shipment.AWB,
                status: finalStatus,
                status_description: statusDescription,
                current_status: finalStatus,
                current_status_description: statusDescription,
                delivered_date: shipment.DeliveryDate,
                delivered_to: shipment.Consignee?.Name,
                remarks: shipment.Status?.Instructions
              }
            };
            
            console.log(`✅ [DELHIVERY_BULK_${batchId}] Processed tracking result:`, {
              trackingId: processedResult.data.tracking_id,
              originalStatus: status,
              finalStatus: finalStatus,
              statusDescription: statusDescription
            });
            
            results.push(processedResult);
          }
        } else {
          console.log(`⚠️ [DELHIVERY_BULK_${batchId}] No valid ShipmentData in response`);
          console.log(`📄 [DELHIVERY_BULK_${batchId}] Response structure:`, {
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : 'no data',
            hasShipmentData: !!(data && data.ShipmentData),
            shipmentDataLength: data && data.ShipmentData ? data.ShipmentData.length : 0,
            responseType: typeof data
          });
          
          // If bulk request fails, add error for each tracking ID
          batch.forEach(trackingId => {
            const errorResult = {
              success: false,
              error: data?.error || data?.message || 'No ShipmentData found in response'
            };
            console.log(`❌ [DELHIVERY_BULK_${batchId}] Error for ${trackingId}:`, errorResult.error);
            results.push(errorResult);
          });
        }
        
        console.log(`✅ [DELHIVERY_BULK_${batchId}] Batch ${batchNumber}/${totalBatches} completed with ${results.length} total results so far`);
      } catch (error) {
        console.error(`❌ [DELHIVERY_BULK_${batchId}] Error in bulk tracking request for batch ${batchNumber}:`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          batchSize: batch.length,
          trackingIds: batch
        });
        
        // Add error for each tracking ID in this batch
        batch.forEach(trackingId => {
          const errorResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          };
          console.log(`❌ [DELHIVERY_BULK_${batchId}] Error for ${trackingId}:`, errorResult.error);
          results.push(errorResult);
        });
      }
      
      // Add delay between batches to be respectful to the API
      if (i + batchSize < trackingIds.length) {
        console.log(`⏳ [DELHIVERY_BULK_${batchId}] Waiting 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(`🏁 [DELHIVERY_BULK_${batchId}] Bulk tracking completed: ${results.length} total results`);
    console.log(`📊 [DELHIVERY_BULK_${batchId}] Success count: ${results.filter(r => r.success).length}`);
    console.log(`📊 [DELHIVERY_BULK_${batchId}] Error count: ${results.filter(r => !r.success).length}`);
    
    return results;
  }

  /**
   * Map Delhivery status to our internal status
   * Simple mapping: manifested → manifested, delivered → delivered, returned → returned, everything else → in_transit
   */
  mapStatusToInternal(delhiveryStatus: string): string {
    const lowerStatus = delhiveryStatus.toLowerCase();
    
    console.log(`🔄 [STATUS_MAPPING] Mapping Delhivery status: "${delhiveryStatus}" → "${lowerStatus}"`);
    
    // Only 3 specific statuses, everything else is In Transit
    if (lowerStatus === 'delivered') {
      console.log(`✅ [STATUS_MAPPING] Mapped to: delivered`);
      return 'delivered';
    }
    
    if (lowerStatus === 'manifested' || lowerStatus === 'not picked') {
      console.log(`⏳ [STATUS_MAPPING] Mapped to: manifested (Not Dispatched)`);
      return 'manifested';
    }
    
    if (lowerStatus === 'returned') {
      console.log(`↩️ [STATUS_MAPPING] Mapped to: returned`);
      return 'returned';
    }
    
    // Everything else (dispatched, in transit, success, pending, etc.) → in_transit
    console.log(`🚚 [STATUS_MAPPING] Mapped to: in_transit (In Transit)`);
    return 'in_transit';
  }

  /**
   * Check if an order should be considered final (no more updates needed)
   */
  isFinalStatus(status: string): boolean {
    const finalStatuses = ['delivered', 'returned', 'failed'];
    return finalStatuses.includes(status);
  }
}

export const delhiveryTrackingService = new DelhiveryTrackingService();
