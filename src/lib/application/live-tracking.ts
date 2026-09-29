import { prisma } from '@/lib/prisma';
import { orderAccessWhere } from '@/lib/application/policy';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';
import type { AuthenticatedUser } from '@/lib/auth-middleware';

const DELHIVERY_TRACKING_URL = 'https://track.delhivery.com/api/v1/packages/json';

type DelhiveryScan = {
  ScanDetail: { ScanDateTime: string; Scan: string; ScannedLocation: string; StatusCode: string; Instructions: string };
};

type DelhiveryShipment = {
  AWB: string;
  Status: { Status: string; StatusLocation: string; StatusDateTime: string; StatusCode: string; Instructions: string };
  Origin: string;
  Destination: string;
  PickUpDate: string;
  DeliveryDate?: string;
  ExpectedDeliveryDate?: string;
  Scans?: DelhiveryScan[];
};

/** The tracking shape the website's tracking modal shows. */
export type LiveTracking = {
  waybill: string;
  status: string;
  status_description: string;
  origin: string;
  destination: string;
  current_location: string;
  current_status: string;
  current_status_description: string;
  current_status_time: string | null;
  pickup_date: string;
  delivered_date: string | null;
  expected_delivery_date: string | null;
  tracking_events: Array<{ status: string; status_description: string; location: string; timestamp: string; remarks: string }>;
};

export type LiveTrackingResult =
  | { ok: true; order: { id: number; courierService: string; pickupLocation: string }; tracking: LiveTracking }
  | { ok: false; status: 400 | 404 | 502; error: string; details?: string };

/** Asks Delhivery for a waybill's current status and scan history. */
export async function fetchDelhiveryTracking(
  waybill: string,
  apiKey: string
): Promise<{ ok: true; tracking: LiveTracking } | { ok: false; status: 404 | 502; error: string; details?: string }> {
  const params = new URLSearchParams({ token: apiKey, waybill });
  const response = await fetch(`${DELHIVERY_TRACKING_URL}?${params}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });
  if (!response.ok) {
    return { ok: false, status: 502, error: `Delhivery API error: ${response.status} ${response.statusText}`, details: await response.text() };
  }

  const body = (await response.json()) as { ShipmentData?: Array<{ Shipment: DelhiveryShipment }> };
  const shipment = body.ShipmentData?.[0]?.Shipment;
  if (!shipment) {
    return { ok: false, status: 404, error: 'No tracking data found for this waybill number' };
  }

  return {
    ok: true,
    tracking: {
      waybill: shipment.AWB,
      status: shipment.Status.Status,
      status_description: shipment.Status.Instructions,
      origin: shipment.Origin,
      destination: shipment.Destination,
      current_location: shipment.Status.StatusLocation,
      current_status: shipment.Status.Status,
      current_status_description: shipment.Status.Instructions,
      current_status_time: shipment.Status.StatusDateTime ?? null,
      pickup_date: shipment.PickUpDate,
      delivered_date: shipment.DeliveryDate || null,
      expected_delivery_date: shipment.ExpectedDeliveryDate || null,
      tracking_events: (shipment.Scans ?? []).map((scan) => ({
        status: scan.ScanDetail.Scan,
        status_description: scan.ScanDetail.Instructions,
        location: scan.ScanDetail.ScannedLocation,
        timestamp: scan.ScanDetail.ScanDateTime,
        remarks: scan.ScanDetail.StatusCode,
      })),
    },
  };
}

/**
 * Live Delhivery tracking for an order the user may access, found by order ID
 * or waybill, using the Delhivery key of the order's own pickup location.
 * Shared by the website's tracking view and MCP. Does not change the order.
 */
export async function getLiveTracking(
  user: AuthenticatedUser,
  lookup: { orderId?: number; waybill?: string }
): Promise<LiveTrackingResult> {
  const waybill = lookup.waybill?.trim();
  if (!lookup.orderId && !waybill) {
    return { ok: false, status: 400, error: 'Waybill number is required' };
  }

  const order = await prisma.orders.findFirst({
    where: {
      AND: [
        await orderAccessWhere(user),
        lookup.orderId ? { id: lookup.orderId } : { OR: [{ delhivery_waybill_number: waybill }, { tracking_id: waybill }] },
      ],
    },
    select: { id: true, courier_service: true, pickup_location: true, tracking_id: true, delhivery_waybill_number: true },
  });
  if (!order) {
    return { ok: false, status: 404, error: 'Order not found' };
  }

  const trackingWaybill = waybill || order.delhivery_waybill_number || order.tracking_id;
  if (!trackingWaybill) {
    return { ok: false, status: 404, error: 'This order has no waybill yet' };
  }
  if (order.courier_service.toLowerCase() !== 'delhivery') {
    return { ok: false, status: 400, error: `Live tracking is only available for Delhivery shipments (this one is ${order.courier_service})` };
  }

  const apiKey = await getDelhiveryApiKey(order.pickup_location, user.clientId);
  if (!apiKey) {
    return { ok: false, status: 400, error: 'Delhivery API key not found for this pickup location' };
  }

  const live = await fetchDelhiveryTracking(trackingWaybill, apiKey);
  if (!live.ok) return live;
  return {
    ok: true,
    order: { id: order.id, courierService: order.courier_service, pickupLocation: order.pickup_location },
    tracking: live.tracking,
  };
}
