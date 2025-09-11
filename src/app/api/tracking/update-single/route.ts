import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

export async function POST(request: NextRequest) {
  try {
    const { orderId, trackingId, apiKey } = await request.json();
    
    if (!orderId || !trackingId || !apiKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters: orderId, trackingId, apiKey' 
      }, { status: 400 });
    }

    console.log(`🔄 [UPDATE_SINGLE] Updating order ${orderId} with tracking ID ${trackingId}`);

    // Fetch tracking details from Delhivery
    const trackingResult = await delhiveryTrackingService.getTrackingDetails(trackingId, apiKey);
    
    if (trackingResult.success && trackingResult.data) {
      const newStatus = delhiveryTrackingService.mapStatusToInternal(
        trackingResult.data.current_status || trackingResult.data.status
      );

      // Update the order in the database
      const updatedOrder = await prisma.orders.update({
        where: { id: orderId },
        data: {
          delhivery_api_status: newStatus,
          delhivery_api_error: null,
          updated_at: new Date()
        }
      });

      console.log(`✅ [UPDATE_SINGLE] Updated order ${orderId}: ${newStatus}`);

      return NextResponse.json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          orderId,
          newStatus,
          trackingData: trackingResult.data
        }
      });
    } else {
      // Update with error status
      await prisma.orders.update({
        where: { id: orderId },
        data: {
          delhivery_api_error: trackingResult.error || 'Failed to fetch tracking data',
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: false,
        error: trackingResult.error || 'Failed to fetch tracking data'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [UPDATE_SINGLE] Error updating single order:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
