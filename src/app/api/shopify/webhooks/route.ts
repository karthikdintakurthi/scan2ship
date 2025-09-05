import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Verify Shopify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const hash = hmac.digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'base64'),
      Buffer.from(hash, 'base64')
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

// POST /api/shopify/webhooks - Handle Shopify webhooks
export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-shopify-hmac-sha256');
    const shop = request.headers.get('x-shopify-shop-domain');
    const topic = request.headers.get('x-shopify-topic');

    if (!signature || !shop || !topic) {
      return NextResponse.json({ error: 'Missing required headers' }, { status: 400 });
    }

    const payload = await request.text();
    const webhookSecret = process.env.SHOPIFY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('Shopify webhook secret not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const data = JSON.parse(payload);

    // Find the integration for this shop
    const integration = await prisma.shopify_integrations.findFirst({
      where: {
        shopDomain: shop,
        isActive: true
      }
    });

    if (!integration) {
      console.error(`No active integration found for shop: ${shop}`);
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Handle different webhook topics
    switch (topic) {
      case 'orders/create':
        await handleOrderCreate(integration.clientId, data);
        break;
      case 'orders/updated':
        await handleOrderUpdate(integration.clientId, data);
        break;
      case 'orders/paid':
        await handleOrderPaid(integration.clientId, data);
        break;
      case 'orders/cancelled':
        await handleOrderCancelled(integration.clientId, data);
        break;
      default:
        console.log(`Unhandled webhook topic: ${topic}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleOrderCreate(clientId: string, orderData: any) {
  try {
    console.log(`Processing order create webhook for client: ${clientId}, order: ${orderData.id}`);

    // Check if order already exists
    const existingOrder = await prisma.shopify_orders.findFirst({
      where: {
        clientId,
        shopifyOrderId: orderData.id.toString()
      }
    });

    if (existingOrder) {
      console.log(`Order ${orderData.id} already exists, skipping`);
      return;
    }

    // Create Shopify order record
    await prisma.shopify_orders.create({
      data: {
        id: crypto.randomUUID(),
        clientId,
        shopifyOrderId: orderData.id.toString(),
        shopifyOrderName: orderData.name,
        status: 'pending',
        syncData: orderData
      }
    });

    console.log(`Created Shopify order record: ${orderData.id}`);
  } catch (error) {
    console.error('Error handling order create:', error);
  }
}

async function handleOrderUpdate(clientId: string, orderData: any) {
  try {
    console.log(`Processing order update webhook for client: ${clientId}, order: ${orderData.id}`);

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
  } catch (error) {
    console.error('Error handling order update:', error);
  }
}

async function handleOrderPaid(clientId: string, orderData: any) {
  try {
    console.log(`Processing order paid webhook for client: ${clientId}, order: ${orderData.id}`);

    // Update order status
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

    // Here you could trigger automatic order creation in Scan2Ship
    // await createScan2ShipOrder(clientId, orderData);
  } catch (error) {
    console.error('Error handling order paid:', error);
  }
}

async function handleOrderCancelled(clientId: string, orderData: any) {
  try {
    console.log(`Processing order cancelled webhook for client: ${clientId}, order: ${orderData.id}`);

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
  } catch (error) {
    console.error('Error handling order cancelled:', error);
  }
}
