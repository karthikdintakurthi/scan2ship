import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { applySecurityMiddleware, securityHeaders } from '@/lib/security-middleware';
import { authorizeUser, UserRole, PermissionLevel } from '@/lib/auth-middleware';
import { delhiveryService } from '@/lib/delhivery';
import { findAccessibleOrder, parseOrderId } from '@/lib/application/policy';

// Fields the order edit form may change. Tenant, creator, sub-group, billing,
// and carrier state are deliberately excluded.
const EDITABLE_ORDER_FIELDS = [
  'name',
  'mobile',
  'address',
  'city',
  'state',
  'country',
  'pincode',
  'courier_service',
  'pickup_location',
  'package_value',
  'weight',
  'total_items',
  'is_cod',
  'cod_amount',
  'reference_number',
  'reseller_name',
  'reseller_mobile',
  'tracking_id',
] as const;

export async function GET(
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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.READ],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const orderId = parseOrderId((await params).id)
    const order = orderId ? await findAccessibleOrder(authResult.user!, orderId) : null

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch order' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const existing = orderId ? await findAccessibleOrder(authResult.user!, orderId, { select: { id: true } }) : null
    if (!existing) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const body = await request.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 })
    }

    const rejectedFields = Object.keys(body).filter(
      (field) => !(EDITABLE_ORDER_FIELDS as readonly string[]).includes(field)
    )
    if (rejectedFields.length > 0) {
      return NextResponse.json(
        { error: `These fields cannot be updated: ${rejectedFields.join(', ')}` },
        { status: 400 }
      )
    }

    const data: Prisma.ordersUpdateInput = Object.fromEntries(
      EDITABLE_ORDER_FIELDS.filter((field) => field in body).map((field) => [field, body[field]])
    )

    console.log('📦 [API_ORDERS_PUT] Updating order', existing.id, 'fields:', Object.keys(data).join(', '))

    const order = await prisma.orders.update({
      where: { id: existing.id },
      data
    })

    return NextResponse.json(order)
  } catch (error) {
    console.error('❌ [API_ORDERS_PUT] Error updating order:', error)
    console.error('❌ [API_ORDERS_PUT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      orderId: (await params).id
    });
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
      requiredRole: UserRole.CHILD_USER,
      requiredPermissions: [PermissionLevel.DELETE],
      requireActiveUser: true,
      requireActiveClient: true
    });

    if (authResult.response) {
      securityHeaders(authResult.response);
      return authResult.response;
    }

    const orderId = parseOrderId((await params).id)
    const user = authResult.user!;

    // Fetch the order within the user's access scope, with the details needed for cancellation
    const order = orderId ? await findAccessibleOrder(user, orderId, {
      select: {
        id: true,
        courier_service: true,
        tracking_id: true,
        pickup_location: true,
        clientId: true
      }
    }) : null;

    if (!order) {
      const errorMessage = user.role === 'child_user' 
        ? 'Order not found or you do not have permission to delete it'
        : 'Order not found';
      return NextResponse.json(
        { error: errorMessage },
        { status: 404 }
      );
    }

    // If it's a Delhivery order and has a tracking_id (waybill), cancel it in Delhivery first
    let delhiveryCancelResult = null;
    if (order.courier_service?.toLowerCase() === 'delhivery' && order.tracking_id) {
      try {
        console.log('🚫 [API_ORDERS_DELETE] Cancelling Delhivery order before deletion:', order.tracking_id);
        delhiveryCancelResult = await delhiveryService.cancelOrder(
          order.tracking_id,
          order.pickup_location || '',
          order.clientId
        );
        
        if (delhiveryCancelResult.success) {
          console.log('✅ [API_ORDERS_DELETE] Delhivery order cancelled successfully');
        } else {
          console.warn('⚠️ [API_ORDERS_DELETE] Failed to cancel Delhivery order:', delhiveryCancelResult.error);
        }
      } catch (delhiveryError) {
        console.error('❌ [API_ORDERS_DELETE] Error cancelling Delhivery order:', delhiveryError);
        // Continue with deletion even if Delhivery cancellation fails
      }
    }

    // Delete the order from database
    await prisma.orders.delete({
      where: { id: order.id }
    });

    console.log(`✅ [API_ORDERS_DELETE] Order ${order.id} deleted successfully`);

    return NextResponse.json({ 
      message: 'Order deleted successfully',
      delhiveryCancellation: delhiveryCancelResult ? {
        success: delhiveryCancelResult.success,
        message: delhiveryCancelResult.message || delhiveryCancelResult.error
      } : null
    })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    )
  }
}
