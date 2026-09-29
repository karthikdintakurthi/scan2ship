import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryService } from '@/lib/delhivery';
import { WebhookService } from '@/lib/webhook-service';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { findAccessibleOrder, parseOrderId } from '@/lib/application/policy';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';

interface FulfillResponse {
  success: boolean;
  message: string;
  orderId?: number;
  trackingId?: string;
  waybillNumber?: string;
  error?: string;
}

/**
 * Fulfill an order by calling the Delhivery API
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<FulfillResponse>> {
  try {
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      return authResult.response as NextResponse<FulfillResponse>;
    }

    const orderId = parseOrderId((await params).id);
    
    if (!orderId) {
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
      order = await findAccessibleOrder(authResult.user!, orderId, {
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

    let billing: { didCharge: boolean; transactionId: string };
    try {
      billing = await CreditService.chargeOrderBookingIfNeeded(order.clientId, authResult.user!.id, order.id);
    } catch (creditError) {
      if (creditError instanceof InsufficientCreditsError) {
        return NextResponse.json({
          success: false,
          message: 'Insufficient credits',
          error: 'Fulfillment requires 1 credit'
        }, { status: 402 });
      }
      throw creditError;
    }

    const refundIfCharged = async (reason: string) => {
      if (!billing.didCharge) return;
      try {
        await CreditService.refundCredits(order.clientId, CreditService.getCreditCost('ORDER'), `Refund: ${reason}`, 'ORDER', authResult.user!.id, order.id);
      } catch (refundError) {
        console.error('❌ [FULFILL_ORDER] Credit refund failed; reconcile manually:', { transactionId: billing.transactionId, refundError });
      }
    };

    console.log(`📦 [FULFILL_ORDER] Fulfilling order ${orderId}`);

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

      await refundIfCharged('Delhivery booking failed');

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

      await refundIfCharged('Delhivery booking failed');

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
          tracking_status: 'manifested',
          last_delhivery_attempt: new Date(),
          updated_at: new Date()
        }
      });
    } catch (dbError) {
      console.error(`❌ [FULFILL_ORDER] Database update failed:`, dbError);
      throw new Error(`Failed to update order in database: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    }

    console.log(`✅ [FULFILL_ORDER] Updated order ${orderId} with tracking: ${delhiveryResponse.waybill_number}`);

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
