import { NextRequest, NextResponse } from 'next/server';
import { ShopifyApiService } from '@/lib/shopify-api';
import { prisma } from '@/lib/prisma';

// Get API credentials from environment variables
const SHOP_NAME = process.env.SHOPIFY_SHOP_NAME || 'www.vanithafashionjewelry.com';
const ADMIN_ACCESS_TOKEN = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
const API_VERSION = process.env.SHOPIFY_API_VERSION || '2023-10';

// Utility function to update Shopify order
async function updateShopifyTracking(orderId: string, trackingNumber: string, trackingUrl: string) {
  const shopifyDomain = `https://${SHOP_NAME}.myshopify.com`;
  const headers = {
    'X-Shopify-Access-Token': ADMIN_ACCESS_TOKEN || '',
    'Content-Type': 'application/json',
  };

  try {
    console.log(`🛍️ [DELHIVERY_WEBHOOK] Updating Shopify order ${orderId} with tracking ${trackingNumber}`);

    // 1. Get the fulfillment order ID
    const getFulfillmentOrdersUrl = `${shopifyDomain}/admin/api/${API_VERSION}/orders/${orderId}/fulfillment_orders.json`;
    const getResponse = await fetch(getFulfillmentOrdersUrl, { headers });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Failed to get fulfillment orders: ${getResponse.status} - ${errorText}`);
    }

    const fulfillmentOrdersData = await getResponse.json();
    const fulfillmentOrders = fulfillmentOrdersData.fulfillment_orders;

    if (!fulfillmentOrders || fulfillmentOrders.length === 0) {
      console.log(`⚠️ [DELHIVERY_WEBHOOK] No fulfillment orders found for Shopify Order ID: ${orderId}`);
      return { success: false, error: 'No fulfillment orders found' };
    }

    const fulfillmentOrderId = fulfillmentOrders[0].id;
    console.log(`✅ [DELHIVERY_WEBHOOK] Found fulfillment order ID: ${fulfillmentOrderId}`);

    // 2. Create the fulfillment with tracking details
    const createFulfillmentUrl = `${shopifyDomain}/admin/api/${API_VERSION}/fulfillments.json`;
    const payload = {
      fulfillment: {
        line_items_by_fulfillment_order: [
          { fulfillment_order_id: fulfillmentOrderId },
        ],
        tracking_info: {
          number: trackingNumber,
          company: 'Delhivery',
          url: trackingUrl,
        },
        notify_customer: true,
      },
    };

    const postResponse = await fetch(createFulfillmentUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!postResponse.ok) {
      const errorText = await postResponse.text();
      throw new Error(`Failed to create fulfillment: ${postResponse.status} - ${errorText}`);
    }

    const result = await postResponse.json();
    console.log(`✅ [DELHIVERY_WEBHOOK] Successfully updated Shopify order ${orderId} with tracking`);
    return { success: true, data: result };

  } catch (error) {
    console.error(`❌ [DELHIVERY_WEBHOOK] Error updating Shopify order ${orderId}:`, error);
    throw new Error(`Failed to update Shopify tracking: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📦 [DELHIVERY_WEBHOOK] Received Delhivery webhook');
    
    const delhiveryPayload = await request.json();
    console.log('📦 [DELHIVERY_WEBHOOK] Payload:', JSON.stringify(delhiveryPayload, null, 2));

    // Validate the incoming payload from Delhivery
    if (!delhiveryPayload || !delhiveryPayload.tracking_data) {
      console.log('❌ [DELHIVERY_WEBHOOK] Invalid payload - missing tracking_data');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { order_id, awb, tracking_link, status } = delhiveryPayload.tracking_data;

    if (!order_id || !awb || !tracking_link) {
      console.log('❌ [DELHIVERY_WEBHOOK] Missing required data in payload');
      return NextResponse.json({ error: 'Missing required data in payload' }, { status: 400 });
    }

    console.log(`📦 [DELHIVERY_WEBHOOK] Processing tracking update for order ${order_id}, AWB: ${awb}, Status: ${status}`);

    // Only update if the shipment is marked as "Shipped" or equivalent
    if (status && (status.toLowerCase() === 'shipped' || status.toLowerCase() === 'dispatched' || status.toLowerCase() === 'in_transit')) {
      try {
        await updateShopifyTracking(order_id, awb, tracking_link);
        
        // Also update our database with the tracking information
        await prisma.orders.updateMany({
          where: {
            tracking_id: awb
          },
          data: {
            delhivery_api_status: 'shipped',
            updated_at: new Date()
          }
        });

        console.log(`✅ [DELHIVERY_WEBHOOK] Successfully updated Shopify order ${order_id}`);
        return NextResponse.json({ 
          success: true, 
          message: `Updated Shopify order ${order_id} with tracking ${awb}` 
        });
      } catch (error) {
        console.error(`❌ [DELHIVERY_WEBHOOK] Failed to update Shopify order ${order_id}:`, error);
        return NextResponse.json({ 
          success: false, 
          error: error instanceof Error ? error.message : 'Failed to update Shopify order' 
        }, { status: 500 });
      }
    } else {
      console.log(`⚠️ [DELHIVERY_WEBHOOK] Status is not "Shipped" (${status}), no action taken`);
      return NextResponse.json({ 
        success: false, 
        message: `Status is not "Shipped" (${status}), no action taken.` 
      });
    }
  } catch (error) {
    console.error('❌ [DELHIVERY_WEBHOOK] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
