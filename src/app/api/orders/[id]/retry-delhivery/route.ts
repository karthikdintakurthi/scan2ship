import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { delhiveryService } from '@/lib/delhivery'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      requiredRole: UserRole.USER,
      requiredPermissions: [PermissionLevel.WRITE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const { id } = await params
    const orderId = parseInt(id)
    
    // Get the order
    const order = await prisma.orders.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order.courier_service.toLowerCase() !== 'delhivery') {
      return NextResponse.json({ error: 'Order is not a Delhivery order' }, { status: 400 })
    }

    if (order.delhivery_api_status === 'success') {
      return NextResponse.json({ error: 'Order already successfully created in Delhivery' }, { status: 400 })
    }

    // Check retry limit
    if (order.delhivery_retry_count >= 3) {
      return NextResponse.json({ error: 'Maximum retry attempts reached' }, { status: 400 })
    }

    console.log(`Retrying Delhivery order creation for order ID: ${orderId}`)

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
    }

    // Try to create order in Delhivery
    console.log(`🚀 [RETRY_DELHIVERY] Calling Delhivery API for order ${orderId}...`);
    const delhiveryResponse = await delhiveryService.createOrder(orderData)
    console.log(`📡 [RETRY_DELHIVERY] Delhivery API response:`, delhiveryResponse);

    if (delhiveryResponse.success) {
      // Update order with success details
      console.log(`💾 [RETRY_DELHIVERY] Updating order ${orderId} in database...`);
      console.log(`📝 [RETRY_DELHIVERY] Update data:`, {
        delhivery_waybill_number: delhiveryResponse.waybill_number,
        delhivery_order_id: delhiveryResponse.order_id,
        delhivery_api_status: 'success',
        delhivery_tracking_status: 'manifested',
        delhivery_api_error: null,
        delhivery_retry_count: order.delhivery_retry_count + 1,
        last_delhivery_attempt: new Date(),
        tracking_id: delhiveryResponse.waybill_number,
      });

      let updatedOrder;
      try {
        updatedOrder = await prisma.orders.update({
          where: { id: orderId },
          data: {
            delhivery_waybill_number: delhiveryResponse.waybill_number,
            delhivery_order_id: delhiveryResponse.order_id,
            delhivery_api_status: 'success',
        delhivery_tracking_status: 'manifested',
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
        where: { id: orderId },
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
        where: { id: orderId },
        data: {
          delhivery_api_status: 'failed',
          delhivery_api_error: delhiveryResponse.error,
          delhivery_retry_count: order.delhivery_retry_count + 1,
          last_delhivery_attempt: new Date(),
        },
      })

      return NextResponse.json({
        error: 'Failed to create Delhivery order',
        details: delhiveryResponse.error,
        retry_count: order.delhivery_retry_count + 1,
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error retrying Delhivery order:', error)
    
    // Update order with error details
    await prisma.orders.update({
      where: { id: orderId },
      data: {
        delhivery_api_status: 'failed',
        delhivery_api_error: error instanceof Error ? error.message : 'Unknown error',
        delhivery_retry_count: { increment: 1 },
        last_delhivery_attempt: new Date(),
      },
    })

    return NextResponse.json({
      error: 'Failed to retry Delhivery order',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
