import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { orderId, newStatus } = await request.json();
    
    if (!orderId || !newStatus) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: orderId, newStatus' 
      }, { status: 400 });
    }

    console.log(`🔄 [UPDATE_ORDER_STATUS] Updating order ${orderId} to status: ${newStatus}`);

    // Update the order status in the database
    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: {
        delhivery_api_status: newStatus,
        updated_at: new Date()
      }
    });

    console.log(`✅ [UPDATE_ORDER_STATUS] Updated order ${orderId} successfully`);

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: updatedOrder.id,
        newStatus: updatedOrder.delhivery_api_status
      }
    });
  } catch (error) {
    console.error('❌ [UPDATE_ORDER_STATUS] Error updating order status:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
