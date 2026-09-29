import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const SHIPPED_STATUSES = ['shipped', 'dispatched', 'in_transit'];

/**
 * Delhivery sends the shared secret configured in its webhook settings,
 * either as an x-webhook-secret header or a ?token= query parameter.
 */
function hasValidSecret(request: NextRequest, expected: string): boolean {
  const provided = request.headers.get('x-webhook-secret') ?? request.nextUrl?.searchParams.get('token') ?? '';
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return providedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(providedBuffer, expectedBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.DELHIVERY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ [DELHIVERY_WEBHOOK] DELHIVERY_WEBHOOK_SECRET is not configured; rejecting webhook');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    if (!hasValidSecret(request, webhookSecret)) {
      console.warn('🚫 [DELHIVERY_WEBHOOK] Rejected webhook with a missing or invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📦 [DELHIVERY_WEBHOOK] Received Delhivery webhook');

    const delhiveryPayload = await request.json();

    // Validate the incoming payload from Delhivery
    if (!delhiveryPayload || !delhiveryPayload.tracking_data) {
      console.log('❌ [DELHIVERY_WEBHOOK] Invalid payload - missing tracking_data');
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { awb, status } = delhiveryPayload.tracking_data;

    if (!awb || typeof awb !== 'string') {
      console.log('❌ [DELHIVERY_WEBHOOK] Missing AWB in payload');
      return NextResponse.json({ error: 'Missing required data in payload' }, { status: 400 });
    }

    console.log(`📦 [DELHIVERY_WEBHOOK] Processing tracking update for AWB: ${awb}, Status: ${status}`);

    if (!(typeof status === 'string' && SHIPPED_STATUSES.includes(status.toLowerCase()))) {
      console.log(`⚠️ [DELHIVERY_WEBHOOK] Status is not "Shipped" (${status}), no action taken`);
      return NextResponse.json({
        success: false,
        message: `Status is not "Shipped" (${status}), no action taken.`
      });
    }

    // A waybill belongs to one Delhivery order; never update orders in several tenants at once
    const matches = await prisma.orders.findMany({
      where: { tracking_id: awb, courier_service: { equals: 'delhivery', mode: 'insensitive' } },
      select: { id: true, clientId: true },
      take: 2
    });

    if (matches.length === 0) {
      console.log(`⚠️ [DELHIVERY_WEBHOOK] No Delhivery order found for AWB ${awb}`);
      return NextResponse.json({ success: false, message: `No order found for AWB ${awb}` }, { status: 404 });
    }

    if (matches.length > 1) {
      console.error(`❌ [DELHIVERY_WEBHOOK] AWB ${awb} matches more than one order; reconcile manually`, matches);
      return NextResponse.json({ success: false, message: `AWB ${awb} matches more than one order` }, { status: 409 });
    }

    const [order] = matches;
    await prisma.orders.updateMany({
      where: { id: order.id, clientId: order.clientId },
      data: {
        delhivery_api_status: 'shipped',
        updated_at: new Date()
      }
    });

    console.log(`✅ [DELHIVERY_WEBHOOK] Marked order ${order.id} (AWB ${awb}) as shipped`);
    return NextResponse.json({
      success: true,
      message: `Marked the order with AWB ${awb} as shipped`
    });
  } catch (error) {
    console.error('❌ [DELHIVERY_WEBHOOK] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
