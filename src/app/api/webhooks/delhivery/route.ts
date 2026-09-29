import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHIPPED_STATUSES = ['shipped', 'dispatched', 'in_transit'];

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

    const { awb, status } = delhiveryPayload.tracking_data;

    if (!awb) {
      console.log('❌ [DELHIVERY_WEBHOOK] Missing AWB in payload');
      return NextResponse.json({ error: 'Missing required data in payload' }, { status: 400 });
    }

    console.log(`📦 [DELHIVERY_WEBHOOK] Processing tracking update for AWB: ${awb}, Status: ${status}`);

    if (typeof status === 'string' && SHIPPED_STATUSES.includes(status.toLowerCase())) {
      const { count } = await prisma.orders.updateMany({
        where: {
          tracking_id: awb
        },
        data: {
          delhivery_api_status: 'shipped',
          updated_at: new Date()
        }
      });

      console.log(`✅ [DELHIVERY_WEBHOOK] Marked ${count} order(s) with AWB ${awb} as shipped`);
      return NextResponse.json({
        success: true,
        message: `Marked ${count} order(s) with AWB ${awb} as shipped`
      });
    }

    console.log(`⚠️ [DELHIVERY_WEBHOOK] Status is not "Shipped" (${status}), no action taken`);
    return NextResponse.json({
      success: false,
      message: `Status is not "Shipped" (${status}), no action taken.`
    });
  } catch (error) {
    console.error('❌ [DELHIVERY_WEBHOOK] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
