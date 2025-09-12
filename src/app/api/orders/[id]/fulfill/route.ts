import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { ShopifyApiService } from '@/lib/shopify-api';
import { WebhookService } from '@/lib/webhook-service';

interface FulfillResponse {
  success: boolean;
  message: string;
  orderId?: number;
  trackingId?: string;
  waybillNumber?: string;
  error?: string;
}

/**
 * Fulfill an order by calling Delhivery API and updating Shopify
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse<FulfillResponse>> {
  try {
    const orderId = parseInt(params.id);
    
    if (isNaN(orderId)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid order ID',
        error: 'Order ID must be a number'
      }, { status: 400 });
    }

    console.log(`🚀 [FULFILL_ORDER] Starting fulfillment process for order ${orderId}`);

    // Get the order details
    let order;
    try {
      order = await prisma.orders.findUnique({
        where: { id: orderId },
        include: {
          clients: true
        }
      });
      console.log(`🔍 [FULFILL_ORDER] Order query successful, order found:`, !!order);
    } catch (dbQueryError) {
      console.error(`❌ [FULFILL_ORDER] Database query failed:`, dbQueryError);
      throw new Error(`Failed to fetch order from database: ${dbQueryError instanceof Error ? dbQueryError.message : 'Unknown database error'}`);
    }

    if (!order) {
      return NextResponse.json({
        success: false,
        message: 'Order not found',
        error: 'Order does not exist'
      }, { status: 404 });
    }

    // Check if order is already fulfilled
    if (order.tracking_id && order.delhivery_api_status === 'success') {
      return NextResponse.json({
        success: false,
        message: 'Order already fulfilled',
        error: 'Order already has tracking information'
      }, { status: 400 });
    }

    console.log(`📦 [FULFILL_ORDER] Order details:`, {
      id: order.id,
      referenceNumber: order.reference_number,
      courierService: order.courier_service,
      name: order.name,
      address: order.address
    });

    // Call Delhivery API to create waybill
    console.log(`🚚 [FULFILL_ORDER] Calling Delhivery API for order ${orderId}...`);
    
    let delhiveryResponse;
    try {
      delhiveryResponse = await delhiveryService.createOrder(order);
    } catch (delhiveryError) {
      console.error(`❌ [FULFILL_ORDER] Delhivery API exception:`, delhiveryError);
      
      // Update order with error status
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: delhiveryError instanceof Error ? delhiveryError.message : 'Unknown Delhivery API error',
          last_delhivery_attempt: new Date(),
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        message: 'Failed to create waybill',
        error: delhiveryError instanceof Error ? delhiveryError.message : 'Unknown Delhivery API error'
      }, { status: 500 });
    }
    
    if (!delhiveryResponse.success) {
      console.error(`❌ [FULFILL_ORDER] Delhivery API failed:`, delhiveryResponse.error);
      
      // Update order with error status
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: delhiveryResponse.error,
          last_delhivery_attempt: new Date(),
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        message: 'Failed to create waybill',
        error: delhiveryResponse.error
      }, { status: 500 });
    }

    console.log(`✅ [FULFILL_ORDER] Delhivery API successful:`, {
      waybillNumber: delhiveryResponse.waybill_number,
      orderId: delhiveryResponse.order_id
    });

    // Update order with Delhivery data
    try {
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          tracking_id: delhiveryResponse.waybill_number,
          delhivery_waybill_number: delhiveryResponse.waybill_number,
          delhivery_order_id: delhiveryResponse.order_id,
          delhivery_api_status: 'success',
          delhivery_tracking_status: 'manifested',
          last_delhivery_attempt: new Date(),
          shopify_status: 'pending', // Will be updated after Shopify call
          updated_at: new Date()
        }
      });
    } catch (dbError) {
      console.error(`❌ [FULFILL_ORDER] Database update failed:`, dbError);
      throw new Error(`Failed to update order in database: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }

    console.log(`✅ [FULFILL_ORDER] Updated order ${orderId} with tracking: ${delhiveryResponse.waybill_number}`);

    // Find the corresponding Shopify order
    const shopifyOrder = await prisma.shopify_orders.findFirst({
      where: {
        orderId: orderId
      }
    });

    if (shopifyOrder) {
      console.log(`🛍️ [FULFILL_ORDER] Found Shopify order: ${shopifyOrder.shopifyOrderId}`);
      
      // Update Shopify with tracking information using order update (more reliable)
      const shopifyUpdateResult = await ShopifyApiService.updateOrderWithTracking(
        shopifyOrder.syncData?.shop?.domain || 'www.vanithafashionjewelry.com',
        shopifyOrder.shopifyOrderId,
        delhiveryResponse.waybill_number,
        order.courier_service,
        `https://www.delhivery.com/track/package/${delhiveryResponse.waybill_number}`
      );

      if (shopifyUpdateResult.success) {
        console.log(`✅ [FULFILL_ORDER] Successfully updated Shopify order with tracking`);
        
        // Update Shopify order status
        try {
          await prisma.shopify_orders.update({
            where: { id: shopifyOrder.id },
            data: {
              status: 'fulfilled',
              updatedAt: new Date()
            }
          });
        } catch (shopifyDbError) {
          console.error(`❌ [FULFILL_ORDER] Failed to update Shopify order in database:`, shopifyDbError);
        }

        // Update order with Shopify success status
        try {
          await prisma.orders.update({
            where: { id: orderId },
            data: {
              shopify_status: 'fulfilled',
              shopify_tracking_number: delhiveryResponse.waybill_number,
              shopify_api_status: 'success',
              last_shopify_attempt: new Date(),
              updated_at: new Date()
            }
          });
        } catch (orderDbError) {
          console.error(`❌ [FULFILL_ORDER] Failed to update order with Shopify status:`, orderDbError);
        }
      } else {
        console.warn(`⚠️ [FULFILL_ORDER] Failed to update Shopify order:`, shopifyUpdateResult.error);
        
        // Update order with Shopify error status
        try {
          await prisma.orders.update({
            where: { id: orderId },
            data: {
              shopify_status: 'error',
              shopify_api_status: 'failed',
              shopify_api_error: shopifyUpdateResult.error,
              last_shopify_attempt: new Date(),
              updated_at: new Date()
            }
          });
        } catch (shopifyErrorDbError) {
          console.error(`❌ [FULFILL_ORDER] Failed to update order with Shopify error status:`, shopifyErrorDbError);
        }
      }
    } else {
      console.log(`⚠️ [FULFILL_ORDER] No Shopify order found for Scan2Ship order ${orderId}`);
    }

    // Trigger webhooks for fulfillment
    await WebhookService.triggerWebhooks('order.fulfilled', {
      order: {
        id: orderId,
        trackingId: delhiveryResponse.waybill_number,
        referenceNumber: order.reference_number
      },
      client: { id: order.clientId },
      source: 'manual_fulfillment',
      tracking: {
        number: delhiveryResponse.waybill_number,
        company: order.courier_service,
        url: `https://www.delhivery.com/track/package/${delhiveryResponse.waybill_number}`
      }
    }, order.clientId, orderId.toString());

    console.log(`🎉 [FULFILL_ORDER] Successfully fulfilled order ${orderId}`);

    return NextResponse.json({
      success: true,
      message: 'Order fulfilled successfully',
      orderId: orderId,
      trackingId: delhiveryResponse.waybill_number,
      waybillNumber: delhiveryResponse.waybill_number
    });

  } catch (error) {
    console.error('❌ [FULFILL_ORDER] Error:', error);
    
    // Handle Prisma errors specifically
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as any;
      console.error('❌ [FULFILL_ORDER] Prisma error details:', {
        code: prismaError.code,
        message: prismaError.message,
        meta: prismaError.meta
      });
      
      return NextResponse.json({
        success: false,
        message: 'Database error occurred',
        error: `Database error: ${prismaError.message}`,
        details: prismaError.code
      }, { status: 500 });
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ [FULFILL_ORDER] General error:', errorMessage);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fulfill order',
      error: errorMessage
    }, { status: 500 });
  }
}
