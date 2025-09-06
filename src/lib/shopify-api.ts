import { prisma } from './prisma';

export interface ShopifyOrderUpdate {
  fulfillment?: {
    tracking_number?: string;
    tracking_company?: string;
    notify_customer?: boolean;
  };
  note?: string;
  tags?: string;
}

export class ShopifyApiService {
  /**
   * Update a Shopify order with tracking information
   */
  static async updateOrderWithTracking(
    shopDomain: string,
    orderId: string,
    trackingNumber: string,
    courierService: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🛍️ [SHOPIFY_API] Updating order ${orderId} in shop ${shopDomain} with tracking: ${trackingNumber}`);

      // Get the Shopify integration for this shop
      const integration = await prisma.shopify_integrations.findFirst({
        where: {
          shopDomain,
          isActive: true
        }
      });

      if (!integration) {
        throw new Error(`No active Shopify integration found for shop: ${shopDomain}`);
      }

      if (!integration.accessToken) {
        throw new Error(`No access token found for shop: ${shopDomain}`);
      }

      // Map courier service to Shopify tracking company
      const trackingCompany = this.mapCourierServiceToShopify(trackingNumber, courierService);

      // Prepare the update payload
      const updateData: ShopifyOrderUpdate = {
        fulfillment: {
          tracking_number: trackingNumber,
          tracking_company: trackingCompany,
          notify_customer: true
        },
        note: `Tracking updated by Scan2Ship: ${trackingNumber}`,
        tags: `scan2ship,${courierService.toLowerCase()}`
      };

      // Make API call to Shopify
      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/orders/${orderId}.json`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': integration.accessToken
        },
        body: JSON.stringify({
          order: updateData
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ [SHOPIFY_API] Successfully updated order ${orderId} in Shopify`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [SHOPIFY_API] Failed to update Shopify order ${orderId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a fulfillment for a Shopify order using the proper fulfillment order flow
   */
  static async createFulfillment(
    shopDomain: string,
    orderId: string,
    trackingNumber: string,
    courierService: string,
    trackingUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📦 [SHOPIFY_API] Creating fulfillment for order ${orderId} in shop ${shopDomain}`);

      // Get the Shopify integration for this shop
      const integration = await prisma.shopify_integrations.findFirst({
        where: {
          shopDomain,
          isActive: true
        }
      });

      if (!integration) {
        throw new Error(`No active Shopify integration found for shop: ${shopDomain}`);
      }

      if (!integration.accessToken) {
        throw new Error(`No access token found for shop: ${shopDomain}`);
      }

      // Map courier service to Shopify tracking company
      const trackingCompany = this.mapCourierServiceToShopify(trackingNumber, courierService);

      // Step 1: Check if order already has fulfillments
      console.log(`🔍 [SHOPIFY_API] Checking existing fulfillments for order ${orderId}`);
      const getFulfillmentsUrl = `https://${shopDomain}/admin/api/2023-10/orders/${orderId}/fulfillments.json`;
      
      const getFulfillmentsResponse = await fetch(getFulfillmentsUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': integration.accessToken,
          'Content-Type': 'application/json'
        }
      });

      if (getFulfillmentsResponse.ok) {
        const fulfillmentsData = await getFulfillmentsResponse.json();
        const fulfillments = fulfillmentsData.fulfillments;

        if (fulfillments && fulfillments.length > 0) {
          // Order has fulfillments, update the first one with tracking
          const existingFulfillment = fulfillments[0];
          console.log(`✅ [SHOPIFY_API] Found existing fulfillment ID: ${existingFulfillment.id}, updating with tracking...`);
          
          return await this.updateFulfillment(
            shopDomain,
            orderId,
            existingFulfillment.id.toString(),
            trackingNumber,
            trackingCompany,
            trackingUrl
          );
        }
      }

      // Step 2: No existing fulfillments, create a new one using modern Fulfillment Order API
      console.log(`📦 [SHOPIFY_API] No existing fulfillments found, creating new fulfillment using modern API: ${trackingNumber}`);
      
      // Step 2a: Get fulfillment orders for the order
      console.log(`🔍 [SHOPIFY_API] Getting fulfillment orders for order ${orderId}`);
      const getFulfillmentOrdersUrl = `https://${shopDomain}/admin/api/2023-10/orders/${orderId}/fulfillment_orders.json`;
      
      const getFulfillmentOrdersResponse = await fetch(getFulfillmentOrdersUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': integration.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!getFulfillmentOrdersResponse.ok) {
        const errorText = await getFulfillmentOrdersResponse.text();
        throw new Error(`Failed to get fulfillment orders: ${getFulfillmentOrdersResponse.status} - ${errorText}`);
      }

      const fulfillmentOrdersData = await getFulfillmentOrdersResponse.json();
      const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders;

      if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
        console.log(`⚠️ [SHOPIFY_API] No fulfillment orders found for order ${orderId}`);
        return { success: false, error: 'No fulfillment orders found' };
      }

      const fulfillmentOrder = fulfillmentOrders[0];
      console.log(`✅ [SHOPIFY_API] Found fulfillment order ID: ${fulfillmentOrder.id}`);

      // Step 2b: Create fulfillment using modern API
      console.log(`📦 [SHOPIFY_API] Creating fulfillment with tracking using modern API: ${trackingNumber}`);
      const createFulfillmentUrl = `https://${shopDomain}/admin/api/2023-10/fulfillments.json`;
      
      const fulfillmentPayload = {
        fulfillment: {
          location_id: fulfillmentOrder.assigned_location_id,
          fulfillment_order_id: fulfillmentOrder.id,
          tracking_info: {
            number: trackingNumber,
            company: trackingCompany,
            url: trackingUrl || `https://www.delhivery.com/track/package/${trackingNumber}`
          }
        }
      };

      console.log(`📋 [SHOPIFY_API] Modern fulfillment payload:`, JSON.stringify(fulfillmentPayload, null, 2));

      const postResponse = await fetch(createFulfillmentUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': integration.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fulfillmentPayload)
      });

      if (!postResponse.ok) {
        const errorText = await postResponse.text();
        throw new Error(`Failed to create fulfillment: ${postResponse.status} - ${errorText}`);
      }

      const result = await postResponse.json();
      console.log(`✅ [SHOPIFY_API] Successfully created fulfillment for order ${orderId} in Shopify using modern API`);
      console.log(`📦 [SHOPIFY_API] Fulfillment ID: ${result.fulfillment.id}`);

      return { success: true, fulfillmentId: result.fulfillment.id.toString() };

    } catch (error) {
      console.error(`❌ [SHOPIFY_API] Failed to create fulfillment for order ${orderId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Map courier service to Shopify tracking company
   */
  private static mapCourierServiceToShopify(trackingNumber: string, courierService: string): string {
    const service = courierService.toLowerCase();
    
    // Map common courier services to Shopify tracking companies
    if (service.includes('delhivery')) {
      return 'Delhivery';
    } else if (service.includes('blue dart')) {
      return 'Blue Dart';
    } else if (service.includes('dtdc')) {
      return 'DTDC';
    } else if (service.includes('fedex')) {
      return 'FedEx';
    } else if (service.includes('ups')) {
      return 'UPS';
    } else if (service.includes('dhl')) {
      return 'DHL';
    } else if (service.includes('india post')) {
      return 'India Post';
    } else {
      // Default to the courier service name or generic
      return courierService || 'Other';
    }
  }

  /**
   * Update existing fulfillment with tracking information
   */
  static async updateFulfillment(
    shopDomain: string,
    orderId: string,
    fulfillmentId: string,
    trackingNumber: string,
    trackingCompany: string,
    trackingUrl?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`📦 [SHOPIFY_API] Updating fulfillment ${fulfillmentId} for order ${orderId} with tracking: ${trackingNumber}`);

      // Get the Shopify integration for this shop
      const integration = await prisma.shopify_integrations.findFirst({
        where: {
          shopDomain,
          isActive: true
        }
      });

      if (!integration) {
        throw new Error(`No active Shopify integration found for shop: ${shopDomain}`);
      }

      if (!integration.accessToken) {
        throw new Error(`No access token found for shop: ${shopDomain}`);
      }

      const updateFulfillmentUrl = `https://${shopDomain}/admin/api/2023-10/orders/${orderId}/fulfillments/${fulfillmentId}.json`;
      
      // Use the correct payload format for updating fulfillments
      const fulfillmentPayload = {
        fulfillment: {
          tracking_number: trackingNumber,
          tracking_company: trackingCompany,
          tracking_urls: [trackingUrl || `https://www.delhivery.com/track/package/${trackingNumber}`],
          notify_customer: true
        }
      };

      console.log(`📋 [SHOPIFY_API] Update fulfillment payload:`, JSON.stringify(fulfillmentPayload, null, 2));

      const putResponse = await fetch(updateFulfillmentUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': integration.accessToken,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(fulfillmentPayload)
      });

      if (!putResponse.ok) {
        const errorText = await putResponse.text();
        throw new Error(`Failed to update fulfillment: ${putResponse.status} - ${errorText}`);
      }

      const result = await putResponse.json();
      console.log(`✅ [SHOPIFY_API] Successfully updated fulfillment ${fulfillmentId} for order ${orderId} in Shopify`);

      return { success: true };

    } catch (error) {
      console.error(`❌ [SHOPIFY_API] Failed to update fulfillment ${fulfillmentId} for order ${orderId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get order details from Shopify
   */
  static async getOrder(shopDomain: string, orderId: string): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      console.log(`🔍 [SHOPIFY_API] Getting order ${orderId} from shop ${shopDomain}`);

      // Get the Shopify integration for this shop
      const integration = await prisma.shopify_integrations.findFirst({
        where: {
          shopDomain,
          isActive: true
        }
      });

      if (!integration) {
        throw new Error(`No active Shopify integration found for shop: ${shopDomain}`);
      }

      if (!integration.accessToken) {
        throw new Error(`No access token found for shop: ${shopDomain}`);
      }

      // Make API call to Shopify
      const response = await fetch(`https://${shopDomain}/admin/api/2023-10/orders/${orderId}.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': integration.accessToken
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ [SHOPIFY_API] Successfully retrieved order ${orderId} from Shopify`);

      return { success: true, order: result.order };

    } catch (error) {
      console.error(`❌ [SHOPIFY_API] Failed to get order ${orderId}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}
