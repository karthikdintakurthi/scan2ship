import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as crypto from 'crypto';
import { WebhookService } from '@/lib/webhook-service';
import { delhiveryService } from '@/lib/delhivery';
import { ShopifyApiService } from '@/lib/shopify-api';

// Types
interface ShopifyWebhookHeaders {
  signature: string;
  shop: string;
  topic: string;
}

interface ShopifyOrderData {
  id: number;
  name: string;
  shop?: {
    domain: string;
  };
  shipping_address?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    company?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
  billing_address?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    address1?: string;
    address2?: string;
    company?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
  };
  line_items?: Array<{
    title: string;
    quantity: number;
    grams?: number;
  }>;
  total_price?: string;
  payment_gateway_names?: string[];
}

interface ShopifyFulfillmentData {
  id: number;
  order_id: number;
  status: string;
  tracking_number?: string;
  tracking_company?: string;
  tracking_url?: string;
  tracking_info?: {
    number?: string;
    company?: string;
    url?: string;
  };
  created_at: string;
  updated_at: string;
  line_items?: Array<{
    id: number;
    quantity: number;
  }>;
}

interface WebhookResponse {
  success: boolean;
  message: string;
  orderId?: number;
  orderName?: string;
  fulfillmentId?: number;
  timestamp: string;
  error?: string;
}

/**
 * Verify Shopify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const hash = hmac.digest('base64');
    
    // Ensure both buffers have the same length
    const signatureBuffer = Buffer.from(signature, 'base64');
    const hashBuffer = Buffer.from(hash, 'base64');
    
    if (signatureBuffer.length !== hashBuffer.length) {
      console.error('❌ [WEBHOOK_SIGNATURE] Signature length mismatch:', signatureBuffer.length, 'vs', hashBuffer.length);
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
  } catch (error) {
    console.error('❌ [WEBHOOK_SIGNATURE] Verification error:', error);
    return false;
  }
}

/**
 * Extract and validate webhook headers
 */
function extractWebhookHeaders(request: NextRequest): ShopifyWebhookHeaders | null {
  const signature = request.headers.get('x-shopify-hmac-sha256');
  const shop = request.headers.get('x-shopify-shop-domain');
  const topic = request.headers.get('x-shopify-topic');

  if (!signature || !shop || !topic) {
    return null;
  }

  return { signature, shop, topic };
}

/**
 * Validate Shopify order data
 */
function validateOrderData(data: any): ShopifyOrderData | null {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid order data: must be an object');
  }

  // Required fields validation
  if (!data.id || typeof data.id !== 'number') {
    throw new Error('Invalid order data: missing or invalid id');
  }

  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid order data: missing or invalid name');
  }

  // Validate shipping address if present
  if (data.shipping_address) {
    const addr = data.shipping_address;
    if (typeof addr !== 'object') {
      throw new Error('Invalid order data: shipping_address must be an object');
    }
    
    // Validate required address fields
    if (!addr.first_name || typeof addr.first_name !== 'string') {
      throw new Error('Invalid order data: shipping_address.first_name is required');
    }
    
    if (!addr.address1 || typeof addr.address1 !== 'string') {
      throw new Error('Invalid order data: shipping_address.address1 is required');
    }
    
    if (!addr.city || typeof addr.city !== 'string') {
      throw new Error('Invalid order data: shipping_address.city is required');
    }
    
    if (!addr.country || typeof addr.country !== 'string') {
      throw new Error('Invalid order data: shipping_address.country is required');
    }
  }

  // Validate line items if present
  if (data.line_items && Array.isArray(data.line_items)) {
    for (const item of data.line_items) {
      if (!item.title || typeof item.title !== 'string') {
        throw new Error('Invalid order data: line_items must have valid title');
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error('Invalid order data: line_items must have valid quantity');
      }
    }
  }

  // Validate total_price if present
  if (data.total_price && typeof data.total_price !== 'string') {
    throw new Error('Invalid order data: total_price must be a string');
  }

  return data as ShopifyOrderData;
}

/**
 * Validate Shopify fulfillment data
 */
function validateFulfillmentData(data: any): ShopifyFulfillmentData | null {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid fulfillment data: must be an object');
  }

  // Required fields validation
  if (!data.id || typeof data.id !== 'number') {
    throw new Error('Invalid fulfillment data: missing or invalid id');
  }

  if (!data.order_id || typeof data.order_id !== 'number') {
    throw new Error('Invalid fulfillment data: missing or invalid order_id');
  }

  if (!data.status || typeof data.status !== 'string') {
    throw new Error('Invalid fulfillment data: missing or invalid status');
  }

  // Validate tracking info if present
  if (data.tracking_info && typeof data.tracking_info !== 'object') {
    throw new Error('Invalid fulfillment data: tracking_info must be an object');
  }

  // Validate line items if present
  if (data.line_items && Array.isArray(data.line_items)) {
    for (const item of data.line_items) {
      if (!item.id || typeof item.id !== 'number') {
        throw new Error('Invalid fulfillment data: line_items must have valid id');
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
        throw new Error('Invalid fulfillment data: line_items must have valid quantity');
      }
    }
  }

  return data as ShopifyFulfillmentData;
}

/**
 * Get Shopify integration by shop domain
 */
async function getIntegrationByShop(shop: string) {
  const integration = await prisma.shopify_integrations.findFirst({
    where: {
      shopDomain: shop,
      isActive: true
    }
  });

  if (!integration) {
    console.log(`❌ [INTEGRATION] No active integration found for shop: ${shop}`);
    return null;
  }

  return integration;
}

/**
 * Find or create Shopify integration (deprecated - use getIntegrationByShop)
 */
async function getOrCreateIntegration(shop: string, clientId: string) {
  let integration = await prisma.shopify_integrations.findFirst({
    where: {
      shopDomain: shop,
      isActive: true
    }
  });

  if (!integration) {
    console.log(`🔧 [INTEGRATION] Creating integration for shop: ${shop}`);
    
    integration = await prisma.shopify_integrations.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        shopDomain: shop,
        accessToken: 'test-token', // TODO: Replace with real token from OAuth flow
        isActive: true,
        syncStatus: 'active',
        lastSyncAt: new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ [INTEGRATION] Created integration for shop: ${shop} with client: ${clientId}`);
  }

  return integration;
}

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest): Promise<NextResponse<WebhookResponse>> {
  try {
    // Extract and validate headers
    const headers = extractWebhookHeaders(request);
    if (!headers) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing required headers',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const { signature, shop, topic } = headers;
    const payload = await request.text();
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    console.log('🔍 [WEBHOOK] Received webhook:', { shop, topic, payloadLength: payload.length });

    // Validate webhook secret
    if (!webhookSecret) {
      console.error('❌ [WEBHOOK] Webhook secret not configured');
      return NextResponse.json({ 
        success: false, 
        message: 'Webhook secret not configured',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

    // Verify webhook signature (always verify for security)
    const isSignatureValid = verifyWebhookSignature(payload, signature, webhookSecret);

    if (!isSignatureValid) {
      console.error('❌ [WEBHOOK] Invalid webhook signature');
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid signature',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Parse and validate webhook data based on topic
    let orderData: ShopifyOrderData | null = null;
    let fulfillmentData: ShopifyFulfillmentData | null = null;

    try {
      if (topic.startsWith('orders/')) {
        const parsed = JSON.parse(payload);
        orderData = validateOrderData(parsed);
      } else if (topic.startsWith('fulfillments/')) {
        const parsed = JSON.parse(payload);
        fulfillmentData = validateFulfillmentData(parsed);
      }
    } catch (parseError) {
      console.error('❌ [WEBHOOK] Invalid JSON payload:', parseError);
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid JSON payload',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Get client ID from integration record
    const integration = await getIntegrationByShop(shop);
    if (!integration) {
      console.error('❌ [WEBHOOK] No integration found for shop:', shop);
      return NextResponse.json({ 
        success: false, 
        message: 'Shop not integrated',
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Handle different webhook topics
    switch (topic) {
      case 'orders/create':
        if (orderData) {
          await handleOrderCreate(integration.clientId, orderData);
        }
        break;
      case 'orders/updated':
        if (orderData) {
          await handleOrderUpdate(integration.clientId, orderData);
        }
        break;
      case 'orders/paid':
        if (orderData) {
          await handleOrderPaid(integration.clientId, orderData);
        }
        break;
      case 'orders/cancelled':
        if (orderData) {
          await handleOrderCancelled(integration.clientId, orderData);
        }
        break;
      case 'fulfillments/create':
        if (fulfillmentData) {
          await handleFulfillmentCreate(integration.clientId, fulfillmentData);
        }
        break;
      case 'fulfillments/update':
        if (fulfillmentData) {
          await handleFulfillmentUpdate(integration.clientId, fulfillmentData);
        }
        break;
      default:
        console.log(`⚠️ [WEBHOOK] Unhandled topic: ${topic}`);
    }

    // Return success response
    const response: WebhookResponse = {
      success: true,
      message: "Webhook processed successfully",
      timestamp: new Date().toISOString()
    };

    if (orderData) {
      response.orderId = orderData.id;
      response.orderName = orderData.name;
    }

    if (fulfillmentData) {
      response.fulfillmentId = fulfillmentData.id;
      response.orderId = fulfillmentData.order_id;
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [WEBHOOK] Processing error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

/**
 * Handle order creation webhook
 */
async function handleOrderCreate(clientId: string, orderData: ShopifyOrderData): Promise<void> {
  try {
    console.log(`📦 [ORDER_CREATE] Processing order ${orderData.id} for client ${clientId}`);

    // Check if order already exists
    const existingOrder = await prisma.shopify_orders.findFirst({
      where: {
        clientId,
        shopifyOrderId: orderData.id.toString()
      }
    });

    if (existingOrder) {
      console.log(`⚠️ [ORDER_CREATE] Order ${orderData.id} already exists, skipping`);
      return;
    }

    // Create Shopify order record
    const shopifyOrder = await prisma.shopify_orders.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        shopifyOrderId: orderData.id.toString(),
        shopifyOrderName: orderData.name,
        status: 'pending',
        syncData: orderData,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [ORDER_CREATE] Created Shopify order record: ${orderData.id}`);

    // Create Scan2Ship order immediately on order creation
    await processOrderCreation(clientId, orderData, shopifyOrder.id);

  } catch (error) {
    console.error('❌ [ORDER_CREATE] Error:', error);
    throw error;
  }
}

/**
 * Process order creation with Scan2Ship integration
 */
async function processOrderCreation(
  clientId: string, 
  orderData: ShopifyOrderData, 
  shopifyOrderId: string
): Promise<void> {
  try {
    const scan2shipOrder = await createScan2ShipOrderFromShopify(clientId, orderData);
    
    if (scan2shipOrder) {
      // Update Shopify order with Scan2Ship reference
      await prisma.shopify_orders.update({
        where: { id: shopifyOrderId },
        data: {
          scan2shipOrderId: scan2shipOrder.id,
          status: 'synced',
          updatedAt: new Date()
        }
      });

      console.log(`✅ [ORDER_CREATE] Created Scan2Ship order ${scan2shipOrder.id} from Shopify order ${orderData.id}`);

      // Trigger webhooks
      await WebhookService.triggerWebhooks('order.created', {
        order: scan2shipOrder,
        client: { id: clientId },
        source: 'shopify',
        shopifyOrder: {
          id: orderData.id,
          name: orderData.name,
          shopifyOrderId: orderData.id.toString()
        }
      }, clientId, scan2shipOrder.id);
    }
  } catch (error) {
    console.error('❌ [ORDER_CREATE] Failed to create Scan2Ship order:', error);
    
    // Update Shopify order status to error
    await prisma.shopify_orders.update({
      where: { id: shopifyOrderId },
      data: {
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: new Date()
      }
    });
  }
}

/**
 * Handle order update webhook
 */
async function handleOrderUpdate(clientId: string, orderData: ShopifyOrderData): Promise<void> {
  try {
    console.log(`🔄 [ORDER_UPDATE] Processing order ${orderData.id} for client ${clientId}`);

    await prisma.shopify_orders.updateMany({
      where: {
        clientId,
        shopifyOrderId: orderData.id.toString()
      },
      data: {
        syncData: orderData,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [ORDER_UPDATE] Updated order ${orderData.id}`);
  } catch (error) {
    console.error('❌ [ORDER_UPDATE] Error:', error);
  }
}

/**
 * Handle order paid webhook
 */
async function handleOrderPaid(clientId: string, orderData: ShopifyOrderData): Promise<void> {
  try {
    console.log(`💰 [ORDER_PAID] Processing order ${orderData.id} for client ${clientId}`);

    await prisma.shopify_orders.updateMany({
      where: {
        clientId,
        shopifyOrderId: orderData.id.toString()
      },
      data: {
        status: 'paid',
        syncData: orderData,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [ORDER_PAID] Updated order ${orderData.id} status to paid`);
  } catch (error) {
    console.error('❌ [ORDER_PAID] Error:', error);
  }
}

/**
 * Handle order cancelled webhook
 */
async function handleOrderCancelled(clientId: string, orderData: ShopifyOrderData): Promise<void> {
  try {
    console.log(`❌ [ORDER_CANCELLED] Processing order ${orderData.id} for client ${clientId}`);

    await prisma.shopify_orders.updateMany({
      where: {
        clientId,
        shopifyOrderId: orderData.id.toString()
      },
      data: {
        status: 'cancelled',
        syncData: orderData,
        updatedAt: new Date()
      }
    });

    console.log(`✅ [ORDER_CANCELLED] Updated order ${orderData.id} status to cancelled`);
  } catch (error) {
    console.error('❌ [ORDER_CANCELLED] Error:', error);
  }
}

/**
 * Handle fulfillment create webhook
 */
async function handleFulfillmentCreate(clientId: string, fulfillmentData: ShopifyFulfillmentData): Promise<void> {
  try {
    console.log(`📦 [FULFILLMENT_CREATE] Processing fulfillment ${fulfillmentData.id} for order ${fulfillmentData.order_id}`);

    // Find the corresponding Shopify order
    const shopifyOrder = await prisma.shopify_orders.findFirst({
      where: {
        clientId,
        shopifyOrderId: fulfillmentData.order_id.toString()
      }
    });

    if (!shopifyOrder) {
      console.log(`⚠️ [FULFILLMENT_CREATE] No Shopify order found for order ID ${fulfillmentData.order_id}`);
      return;
    }

    // Extract tracking information
    const trackingNumber = fulfillmentData.tracking_number || fulfillmentData.tracking_info?.number;
    const trackingCompany = fulfillmentData.tracking_company || fulfillmentData.tracking_info?.company;
    const trackingUrl = fulfillmentData.tracking_url || fulfillmentData.tracking_info?.url;

    if (!trackingNumber) {
      console.log(`⚠️ [FULFILLMENT_CREATE] No tracking number found in fulfillment ${fulfillmentData.id}`);
      return;
    }

    console.log(`📦 [FULFILLMENT_CREATE] Tracking details:`, {
      trackingNumber,
      trackingCompany,
      trackingUrl,
      status: fulfillmentData.status
    });

    // Update the Shopify order with fulfillment data
    await prisma.shopify_orders.update({
      where: { id: shopifyOrder.id },
      data: {
        status: 'fulfilled',
        syncData: {
          ...shopifyOrder.syncData,
          fulfillment: fulfillmentData
        },
        updatedAt: new Date()
      }
    });

    // If we have a Scan2Ship order, update it with tracking information
    if (shopifyOrder.scan2shipOrderId) {
      await updateScan2ShipOrderWithTracking(
        shopifyOrder.scan2shipOrderId,
        trackingNumber,
        trackingCompany,
        trackingUrl
      );
    } else {
      // Create Scan2Ship order if it doesn't exist
      console.log(`📦 [FULFILLMENT_CREATE] Creating Scan2Ship order for Shopify order ${fulfillmentData.order_id}`);
      
      // Get the original order data from Shopify using integration access token
      const shopDomain = shopifyOrder.syncData?.shop?.domain;
      if (!shopDomain) {
        console.error('❌ [FULFILLMENT_CREATE] No shop domain found in Shopify order data');
        return;
      }

      // Get integration to retrieve access token
      const integration = await prisma.shopify_integrations.findFirst({
        where: {
          shopDomain: shopDomain,
          isActive: true
        }
      });

      if (!integration || !integration.accessToken) {
        console.error('❌ [FULFILLMENT_CREATE] No active integration or access token found for shop:', shopDomain);
        return;
      }

      const orderResponse = await fetch(`https://${shopDomain}/admin/api/2023-10/orders/${fulfillmentData.order_id}.json`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': integration.accessToken
        }
      });

      if (orderResponse.ok) {
        const orderData = await orderResponse.json();
        const scan2shipOrder = await createScan2ShipOrderFromShopify(clientId, orderData.order);
        
        if (scan2shipOrder) {
          // Update Shopify order with Scan2Ship reference
          await prisma.shopify_orders.update({
            where: { id: shopifyOrder.id },
            data: {
              scan2shipOrderId: scan2shipOrder.id,
              updatedAt: new Date()
            }
          });

          // Update with tracking information
          await updateScan2ShipOrderWithTracking(
            scan2shipOrder.id,
            trackingNumber,
            trackingCompany,
            trackingUrl
          );

          console.log(`✅ [FULFILLMENT_CREATE] Created Scan2Ship order ${scan2shipOrder.id} and updated with tracking`);
        }
      }
    }

    console.log(`✅ [FULFILLMENT_CREATE] Successfully processed fulfillment ${fulfillmentData.id}`);

  } catch (error) {
    console.error('❌ [FULFILLMENT_CREATE] Error:', error);
  }
}

/**
 * Handle fulfillment update webhook
 */
async function handleFulfillmentUpdate(clientId: string, fulfillmentData: ShopifyFulfillmentData): Promise<void> {
  try {
    console.log(`🔄 [FULFILLMENT_UPDATE] Processing fulfillment update ${fulfillmentData.id} for order ${fulfillmentData.order_id}`);

    // Find the corresponding Shopify order
    const shopifyOrder = await prisma.shopify_orders.findFirst({
      where: {
        clientId,
        shopifyOrderId: fulfillmentData.order_id.toString()
      }
    });

    if (!shopifyOrder) {
      console.log(`⚠️ [FULFILLMENT_UPDATE] No Shopify order found for order ID ${fulfillmentData.order_id}`);
      return;
    }

    // Extract tracking information
    const trackingNumber = fulfillmentData.tracking_number || fulfillmentData.tracking_info?.number;
    const trackingCompany = fulfillmentData.tracking_company || fulfillmentData.tracking_info?.company;
    const trackingUrl = fulfillmentData.tracking_url || fulfillmentData.tracking_info?.url;

    console.log(`🔄 [FULFILLMENT_UPDATE] Updated tracking details:`, {
      trackingNumber,
      trackingCompany,
      trackingUrl,
      status: fulfillmentData.status
    });

    // Update the Shopify order with fulfillment data
    await prisma.shopify_orders.update({
      where: { id: shopifyOrder.id },
      data: {
        status: fulfillmentData.status === 'success' ? 'fulfilled' : 'pending',
        syncData: {
          ...shopifyOrder.syncData,
          fulfillment: fulfillmentData
        },
        updatedAt: new Date()
      }
    });

    // If we have a Scan2Ship order and tracking info, update it
    if (shopifyOrder.scan2shipOrderId && trackingNumber) {
      await updateScan2ShipOrderWithTracking(
        shopifyOrder.scan2shipOrderId,
        trackingNumber,
        trackingCompany,
        trackingUrl
      );
    }

    console.log(`✅ [FULFILLMENT_UPDATE] Successfully processed fulfillment update ${fulfillmentData.id}`);

  } catch (error) {
    console.error('❌ [FULFILLMENT_UPDATE] Error:', error);
  }
}

/**
 * Update Scan2Ship order with tracking information from Shopify fulfillment
 */
async function updateScan2ShipOrderWithTracking(
  scan2shipOrderId: number,
  trackingNumber: string,
  trackingCompany?: string,
  trackingUrl?: string
): Promise<void> {
  try {
    console.log(`🔄 [SCAN2SHIP_UPDATE] Updating Scan2Ship order ${scan2shipOrderId} with tracking: ${trackingNumber}`);

    // Update the Scan2Ship order with tracking information
    await prisma.orders.update({
      where: { id: scan2shipOrderId },
      data: {
        tracking_id: trackingNumber,
        updated_at: new Date()
      }
    });

    console.log(`✅ [SCAN2SHIP_UPDATE] Successfully updated Scan2Ship order ${scan2shipOrderId} with tracking ${trackingNumber}`);

    // Trigger webhooks for tracking update
    await WebhookService.triggerWebhooks('order.tracking_updated', {
      order: { id: scan2shipOrderId, trackingId: trackingNumber },
      client: { id: scan2shipOrderId }, // This should be the actual client ID
      source: 'shopify_fulfillment',
      tracking: {
        number: trackingNumber,
        company: trackingCompany,
        url: trackingUrl
      }
    }, 'a2977c64-362e-4f50-8c9c-32660b1f5b5a', scan2shipOrderId);

  } catch (error) {
    console.error('❌ [SCAN2SHIP_UPDATE] Error updating Scan2Ship order:', error);
  }
}

/**
 * Convert Shopify order to Scan2Ship order format
 */
async function createScan2ShipOrderFromShopify(
  clientId: string, 
  shopifyOrder: ShopifyOrderData
): Promise<any> {
  try {
    console.log(`🔄 [ORDER_CONVERT] Converting Shopify order ${shopifyOrder.id} to Scan2Ship format`);

    // Get client configuration
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        client_order_configs: true,
        pickup_locations: {
          where: { clientId },
          take: 1
        }
      }
    });

    if (!client) {
      throw new Error('Client not found');
    }

    // Extract shipping address
    const shippingAddress = shopifyOrder.shipping_address || shopifyOrder.billing_address;
    if (!shippingAddress) {
      throw new Error('No shipping address found in Shopify order');
    }

    // Calculate totals
    const totalWeight = shopifyOrder.line_items?.reduce((total: number, item: any) => {
      return total + (item.quantity * (item.grams || 0));
    }, 0) || 0;

    const totalItems = shopifyOrder.line_items?.reduce((total: number, item: any) => {
      return total + item.quantity;
    }, 0) || 1;

    // Get default configurations
    const defaultPickupLocation = client.pickup_locations[0]?.value || 'Default Location';
    const defaultCourierService = await prisma.courier_services.findFirst({
      where: {
        clientId,
        isActive: true,
        isDefault: true
      }
    });

    // Prepare order data
    const orderData = {
      name: `${shippingAddress.first_name || ''} ${shippingAddress.last_name || ''}`.trim() || 'Customer',
      mobile: shippingAddress.phone || '0000000000',
      phone: shippingAddress.phone || null,
      address: [
        shippingAddress.address1,
        shippingAddress.address2,
        shippingAddress.company
      ].filter(Boolean).join(', '),
      city: shippingAddress.city || 'Unknown',
      state: shippingAddress.province || 'Unknown',
      country: shippingAddress.country || 'India',
      pincode: shippingAddress.zip || '000000',
      courier_service: defaultCourierService?.name || 'Delhivery',
      pickup_location: defaultPickupLocation,
      package_value: parseFloat(shopifyOrder.total_price || '0'),
      weight: Math.max(totalWeight, 100), // Minimum 100g
      total_items: Math.max(totalItems, 1),
      is_cod: shopifyOrder.payment_gateway_names?.includes('cash_on_delivery') || false,
      cod_amount: shopifyOrder.payment_gateway_names?.includes('cash_on_delivery') 
        ? parseFloat(shopifyOrder.total_price || '0') 
        : null,
      reference_number: shopifyOrder.name || `SHOP-${shopifyOrder.id}`,
      product_description: shopifyOrder.line_items?.map((item: any) => 
        `${item.title} (Qty: ${item.quantity})`
      ).join(', ') || 'Shopify Order'
    };

    // Create the order with unassigned tracking
    const order = await prisma.orders.create({
      data: {
        ...orderData,
        clientId,
        tracking_id: null, // Keep tracking as unassigned
        delhivery_api_status: 'pending', // Mark as pending for manual fulfillment
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    console.log(`✅ [ORDER_CONVERT] Created Scan2Ship order ${order.id} from Shopify order ${shopifyOrder.id} with unassigned tracking`);
    console.log(`ℹ️ [ORDER_CONVERT] Order ready for manual fulfillment - Delhivery API will be called when user clicks fulfill button`);

    // Return updated order data
    const updatedOrder = await prisma.orders.findUnique({
      where: { id: order.id }
    });

    return {
      id: updatedOrder?.id || order.id,
      orderNumber: `ORDER-${updatedOrder?.id || order.id}`,
      referenceNumber: updatedOrder?.reference_number || order.reference_number,
      trackingId: updatedOrder?.tracking_id || order.tracking_id,
      name: updatedOrder?.name || order.name,
      mobile: updatedOrder?.mobile || order.mobile,
      address: updatedOrder?.address || order.address,
      city: updatedOrder?.city || order.city,
      state: updatedOrder?.state || order.state,
      country: updatedOrder?.country || order.country,
      pincode: updatedOrder?.pincode || order.pincode,
      courierService: updatedOrder?.courier_service || order.courier_service,
      pickupLocation: updatedOrder?.pickup_location || order.pickup_location,
      packageValue: updatedOrder?.package_value || order.package_value,
      weight: updatedOrder?.weight || order.weight,
      totalItems: updatedOrder?.total_items || order.total_items,
      isCod: updatedOrder?.is_cod || order.is_cod,
      codAmount: updatedOrder?.cod_amount || order.cod_amount,
      resellerName: updatedOrder?.reseller_name || order.reseller_name,
      resellerMobile: updatedOrder?.reseller_mobile || order.reseller_mobile,
      createdAt: updatedOrder?.created_at || order.created_at,
      updatedAt: updatedOrder?.updated_at || order.updated_at,
      delhiveryWaybillNumber: updatedOrder?.delhivery_waybill_number || order.delhivery_waybill_number,
      delhiveryOrderId: updatedOrder?.delhivery_order_id || order.delhivery_order_id,
      delhiveryApiStatus: updatedOrder?.delhivery_api_status || order.delhivery_api_status
    };

  } catch (error) {
    console.error('❌ [ORDER_CONVERT] Error:', error);
    throw error;
  }
}

/**
 * Process Delhivery integration for order
 */
async function processDelhiveryIntegration(
  order: any, 
  orderData: any, 
  shopifyOrder: ShopifyOrderData
): Promise<void> {
  try {
    console.log('🚚 [DELHIVERY] Calling Delhivery API for order:', order.id);
    
    const delhiveryResponse = await delhiveryService.createOrder(order);
    
    if (delhiveryResponse.success) {
      // Update order with Delhivery data
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          delhivery_waybill_number: delhiveryResponse.waybill_number,
          delhivery_order_id: delhiveryResponse.order_id,
          delhivery_api_status: 'success',
          tracking_id: delhiveryResponse.waybill_number,
          last_delhivery_attempt: new Date(),
          updated_at: new Date()
        }
      });
      
      console.log('✅ [DELHIVERY] Order created successfully with tracking ID:', delhiveryResponse.waybill_number);
      
      // Update Shopify order with tracking information
      await updateShopifyWithTracking(shopifyOrder, delhiveryResponse.waybill_number, orderData.courier_service);
    } else {
      // Update order with error status
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: delhiveryResponse.error,
          last_delhivery_attempt: new Date(),
          updated_at: new Date()
        }
      });
      
      console.log('❌ [DELHIVERY] Order failed:', delhiveryResponse.error);
    }
  } catch (error) {
    console.error('❌ [DELHIVERY] API error:', error);
    
    // Update order with error status
    await prisma.orders.update({
      where: { id: order.id },
      data: {
        delhivery_api_status: 'failed',
        delhivery_api_error: error instanceof Error ? error.message : 'Unknown error',
        last_delhivery_attempt: new Date(),
        updated_at: new Date()
      }
    });
  }
}

/**
 * Update Shopify order with tracking information
 */
async function updateShopifyWithTracking(
  shopifyOrder: ShopifyOrderData, 
  trackingNumber: string, 
  courierService: string
): Promise<void> {
  try {
    console.log('🛍️ [SHOPIFY_UPDATE] Updating Shopify order with tracking information...');
    
    const shopDomain = shopifyOrder.shop?.domain || 'www.vanithafashionjewelry.com';
    const orderId = shopifyOrder.id.toString();
    const trackingUrl = `https://www.delhivery.com/track/package/${trackingNumber}`;
    
    console.log(`🛍️ [SHOPIFY_UPDATE] Updating order ${orderId} in shop ${shopDomain} with tracking: ${trackingNumber}`);
    
    const shopifyUpdateResult = await ShopifyApiService.createFulfillment(
      shopDomain,
      orderId,
      trackingNumber,
      courierService,
      trackingUrl
    );
    
    if (shopifyUpdateResult.success) {
      console.log('✅ [SHOPIFY_UPDATE] Successfully updated Shopify order with tracking');
    } else {
      console.warn('⚠️ [SHOPIFY_UPDATE] Failed to update Shopify order:', shopifyUpdateResult.error);
    }
  } catch (error) {
    console.error('❌ [SHOPIFY_UPDATE] Error updating Shopify order:', error);
  }
}