import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { delhiveryService } from '@/lib/delhivery'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { findAccessibleOrder, parseOrderId } from '@/lib/application/policy';
import { CreditService, InsufficientCreditsError } from '@/lib/credit-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let accessibleOrderId: number | undefined
  let refundIfCharged: ((reason: string) => Promise<void>) | undefined
  try {
    // Apply security middleware
    const securityResponse = await applySecurityMiddleware(
      request,
      new NextResponse(),
      { rateLimit: 'api', cors: true, securityHeaders: true }
    );
    
    if (securityResponse) {
      securityHeaders(securityResponse);
      return securityResponse;
    }

    // Authorize user
    const authResult = await authorizeUser(request, {
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const orderId = parseOrderId((await params).id)
    
    // Get the order
    const order = orderId ? await findAccessibleOrder(authResult.user!, orderId) : null

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }
    accessibleOrderId = order.id

    if (!order.courier_service || typeof order.courier_service !== 'string' || order.courier_service.toLowerCase() !== 'delhivery') {
      return NextResponse.json({ error: 'Order is not a Delhivery order' }, { status: 400 })
    }

    if (order.delhivery_api_status === 'success') {
      return NextResponse.json({ error: 'Order already successfully created in Delhivery' }, { status: 400 })
    }

    // Check retry limit
    if (order.delhivery_retry_count >= 3) {
      return NextResponse.json({ error: 'Maximum retry attempts reached' }, { status: 400 })
    }

    let billing: { didCharge: boolean; transactionId: string };
    try {
      billing = await CreditService.chargeOrderBookingIfNeeded(order.clientId, authResult.user!.id, order.id);
    } catch (creditError) {
      if (creditError instanceof InsufficientCreditsError) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 });
      }
      throw creditError;
    }

    const refundIfChargedForOrder = async (reason: string) => {
      if (!billing.didCharge) return;
      try {
        await CreditService.refundCredits(order.clientId, CreditService.getCreditCost('ORDER'), `Refund: ${reason}`, 'ORDER', authResult.user!.id, order.id);
      } catch (refundError) {
        console.error('❌ [RETRY_DELHIVERY] Credit refund failed; reconcile manually:', { transactionId: billing.transactionId, refundError });
      }
    };
    refundIfCharged = refundIfChargedForOrder;

    console.log(`Retrying Delhivery order creation for order ID: ${orderId}`)
    console.log(`🔍 [RETRY_DELHIVERY] Order belongs to client: ${order.clientId}`)
    console.log(`🔍 [RETRY_DELHIVERY] Pickup location: ${order.pickup_location}`)

    // Prepare order data for Delhivery API
    const orderData = {
      name: order.name,
      mobile: order.mobile,
      address: order.address,
      city: order.city,
      state: order.state,
      country: order.country,
      pincode: order.pincode,
      courier_service: order.courier_service,
      pickup_location: order.pickup_location,
      package_value: order.package_value,
      weight: order.weight,
      total_items: order.total_items,
      tracking_id: order.tracking_id,
      reference_number: order.reference_number,
      is_cod: order.is_cod,
      cod_amount: order.cod_amount,
      reseller_name: order.reseller_name,
      reseller_mobile: order.reseller_mobile,
      clientId: order.clientId,  // Include client ID for correct API key selection
    }

    // Try to create order in Delhivery
    console.log(`🚀 [RETRY_DELHIVERY] Calling Delhivery API for order ${orderId}...`);
    console.log(`🔑 [RETRY_DELHIVERY] Using client ID: ${orderData.clientId} for API key selection`);
    const delhiveryResponse = await delhiveryService.createOrder(orderData)
    console.log(`📡 [RETRY_DELHIVERY] Delhivery API response:`, delhiveryResponse);

    if (delhiveryResponse.success) {
      // Update order with success details
      console.log(`💾 [RETRY_DELHIVERY] Updating order ${orderId} in database...`);
      console.log(`📝 [RETRY_DELHIVERY] Update data:`, {
        delhivery_waybill_number: delhiveryResponse.waybill_number,
        delhivery_order_id: delhiveryResponse.order_id,
        delhivery_api_status: 'success',
        tracking_status: 'manifested',
        delhivery_api_error: null,
        delhivery_retry_count: order.delhivery_retry_count + 1,
        last_delhivery_attempt: new Date(),
        tracking_id: delhiveryResponse.waybill_number,
      });

      let updatedOrder;
      try {
        updatedOrder = await prisma.orders.update({
          where: { id: order.id },
          data: {
            delhivery_waybill_number: delhiveryResponse.waybill_number,
            delhivery_order_id: delhiveryResponse.order_id,
            delhivery_api_status: 'success',
        tracking_status: 'manifested',
            delhivery_api_error: null,
            delhivery_retry_count: order.delhivery_retry_count + 1,
            last_delhivery_attempt: new Date(),
            // Update tracking_id with the new waybill number so it appears in orders list
            tracking_id: delhiveryResponse.waybill_number,
          },
        })
        console.log(`✅ [RETRY_DELHIVERY] Database update successful for order ${orderId}`);
      } catch (dbError) {
        console.error(`❌ [RETRY_DELHIVERY] Database update failed for order ${orderId}:`, dbError);
        throw new Error(`Failed to update order in database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
      }

      console.log(`✅ [RETRY_DELHIVERY] Order ${orderId} updated successfully with waybill: ${delhiveryResponse.waybill_number}`);
      console.log(`📊 [RETRY_DELHIVERY] Updated order data:`, {
        id: updatedOrder.id,
        tracking_id: updatedOrder.tracking_id,
        delhivery_waybill_number: updatedOrder.delhivery_waybill_number,
        delhivery_api_status: updatedOrder.delhivery_api_status
      });

      // Verify the update actually worked by fetching the order again
              const verificationOrder = await prisma.orders.findUnique({
        where: { id: order.id },
        select: {
          id: true,
          tracking_id: true,
          delhivery_waybill_number: true,
          delhivery_api_status: true,
          delhivery_retry_count: true
        }
      });

      console.log(`🔍 [RETRY_DELHIVERY] Verification - Order after update:`, verificationOrder);

      return NextResponse.json({
        message: 'Delhivery order created successfully',
        waybill: delhiveryResponse.waybill_number,
        order_id: delhiveryResponse.order_id,
      })
    } else {
      // Update order with failure details
      await prisma.orders.update({
        where: { id: order.id },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: delhiveryResponse.error,
          delhivery_retry_count: order.delhivery_retry_count + 1,
          last_delhivery_attempt: new Date(),
        },
      })

      await refundIfChargedForOrder('Delhivery booking failed');

      return NextResponse.json({
        error: 'Failed to create Delhivery order',
        details: delhiveryResponse.error,
        retry_count: order.delhivery_retry_count + 1,
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error retrying Delhivery order:', error)
    
    if (accessibleOrderId) {
      await prisma.orders.update({
        where: { id: accessibleOrderId },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: error instanceof Error ? error.message : 'Unknown error',
          delhivery_retry_count: { increment: 1 },
          last_delhivery_attempt: new Date(),
        },
      })
    }

    await refundIfCharged?.('Delhivery booking failed');

    return NextResponse.json({
      error: 'Failed to retry Delhivery order',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
