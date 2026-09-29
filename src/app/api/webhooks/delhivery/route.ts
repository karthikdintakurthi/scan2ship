import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeFixedWindow, getClientIp } from '@/lib/persistent-rate-limiter';

const SHIPPED_STATUSES = ['shipped', 'dispatched', 'in_transit'];

/**
 * Delhivery sends the shared secret configured in its webhook settings,
 * as an x-webhook-secret header or a ?token= query parameter.
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

    const ipLimit = await consumeFixedWindow(`webhook:ip:${getClientIp(request)}`, 60 * 1000, 120);
    if (!ipLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!hasValidSecret(request, webhookSecret)) {
      console.warn('🚫 [DELHIVERY_WEBHOOK] Rejected webhook with a missing or invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const delhiveryPayload = await request.json();

    if (!delhiveryPayload || !delhiveryPayload.tracking_data) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { awb, status } = delhiveryPayload.tracking_data;

    if (!awb || typeof awb !== 'string') {
      return NextResponse.json({ error: 'Missing required data in payload' }, { status: 400 });
    }

    if (!(typeof status === 'string' && SHIPPED_STATUSES.includes(status.toLowerCase()))) {
      return NextResponse.json({
        success: false,
        message: `Status is not "Shipped" (${status}), no action taken.`
      });
    }

    // A waybill belongs to one Delhivery order. Match tracking_id or the
    // stored waybill, and never update when the same AWB exists in two tenants.
    const matches = await prisma.orders.findMany({
      where: {
        courier_service: { equals: 'delhivery', mode: 'insensitive' },
        OR: [{ tracking_id: awb }, { delhivery_waybill_number: awb }],
      },
      select: { id: true, clientId: true },
      take: 2
    });

    if (matches.length === 0) {
      return NextResponse.json({ success: false, message: `No order found for AWB ${awb}` }, { status: 404 });
    }

    if (matches.length > 1) {
      console.error(`❌ [DELHIVERY_WEBHOOK] AWB ${awb} matches more than one order; reconcile manually`);
      return NextResponse.json({ success: false, message: `AWB ${awb} matches more than one order` }, { status: 409 });
    }

    const [order] = matches;
    await prisma.orders.updateMany({
      where: { id: order.id, clientId: order.clientId },
      data: {
        delhivery_api_status: 'shipped',
        tracking_status: status.toLowerCase() === 'in_transit' ? 'in_transit' : 'shipped',
        updated_at: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `Marked the order with AWB ${awb} as shipped`
    });
  } catch (error) {
    console.error('❌ [DELHIVERY_WEBHOOK] Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
