/**
 * @jest-environment node
 *
 * Live Delhivery tracking, shared by the website's tracking view and the
 * track_shipment_live MCP tool.
 */
jest.unmock('jsonwebtoken');

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/persistent-rate-limiter', () => ({
  consumeFixedWindow: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn() }));

import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { getLiveTracking } from '@/lib/application/live-tracking';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';
import { createMcpServer } from '@/lib/mcp/server';
import { executeMcpTool } from '@/lib/mcp/tools';
import type { McpPrincipal } from '@/lib/mcp/principal';
import { authUserRow, signedRequest } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';
import { GET as trackingRoute } from '@/app/api/tracking/delhivery/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const fetchMock = jest.fn();

const ORDERS = [
  { id: 182933, clientId: 'client-a', courier_service: 'delhivery', pickup_location: 'rvd jewels', tracking_id: '29260010951532', delhivery_waybill_number: '29260010951532', sub_group: null, created_by: 'someone' },
  { id: 5, clientId: 'client-a', courier_service: 'india_post', pickup_location: 'rvd jewels', tracking_id: 'EE1IN', delhivery_waybill_number: null, sub_group: null, created_by: 'someone' },
  { id: 6, clientId: 'client-a', courier_service: 'delhivery', pickup_location: 'rvd jewels', tracking_id: 'AWB-NORTH', delhivery_waybill_number: 'AWB-NORTH', sub_group: 'north', created_by: 'someone' },
  { id: 9, clientId: 'client-b', courier_service: 'delhivery', pickup_location: 'b-store', tracking_id: 'AWB-B', delhivery_waybill_number: 'AWB-B', sub_group: null, created_by: 'x' },
];

const scan = (i: number) => ({
  ScanDetail: { ScanDateTime: `2026-09-${String(10 + (i % 18)).padStart(2, '0')}T10:00:00`, Scan: `Scan ${i}`, ScannedLocation: `Hub ${i}`, StatusCode: `X${i}`, Instructions: `Step ${i}` },
});

function delhiveryShipment(scans = 3) {
  return {
    ShipmentData: [
      {
        Shipment: {
          AWB: '29260010951532',
          Status: { Status: 'In Transit', StatusLocation: 'Vijayawada_Hub', StatusDateTime: '2026-09-29T08:15:00', StatusCode: 'X-UCI', Instructions: 'Shipment in transit' },
          Origin: 'Tanuku',
          Destination: 'Hyderabad',
          PickUpDate: '2026-09-12T16:00:00',
          ExpectedDeliveryDate: '2026-10-01T00:00:00',
          Scans: Array.from({ length: scans }, (_, i) => scan(i)),
        },
      },
    ],
  };
}

function actor(role = UserRole.USER, clientId = 'client-a'): AuthenticatedUser {
  return {
    id: 'user-a', email: 'a@x.test', role, clientId, isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

const principal = (scopes: McpPrincipal['scopes'] = ['tracking:read']): McpPrincipal => ({
  requestId: 'r', tenantId: 'client-a', userId: 'user-a', grantId: 'g', oauthClientId: 'c', scopes, role: UserRole.USER, user: actor(),
});

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = fetchMock as never;
  (prisma.orders.findFirst as jest.Mock).mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(null);
  (getDelhiveryApiKey as jest.Mock).mockResolvedValue('key-rvd');
  fetchMock.mockResolvedValue({ ok: true, status: 200, statusText: 'OK', json: async () => delhiveryShipment() });
});

describe('getLiveTracking', () => {
  it("asks Delhivery with the order's own pickup-location key and never writes", async () => {
    const result = await getLiveTracking(actor(), { waybill: '29260010951532' });

    expect(result).toMatchObject({ ok: true, order: { id: 182933 }, tracking: { current_status: 'In Transit', current_location: 'Vijayawada_Hub', current_status_time: '2026-09-29T08:15:00' } });
    expect(getDelhiveryApiKey).toHaveBeenCalledWith('rvd jewels', 'client-a');
    const url = new URL(fetchMock.mock.calls[0][0]);
    expect(url.searchParams.get('waybill')).toBe('29260010951532');
    expect(url.searchParams.get('token')).toBe('key-rvd');
    expect(prisma.writeCalls()).toEqual([]);
  });

  it('finds the waybill by order ID too', async () => {
    expect(await getLiveTracking(actor(), { orderId: 182933 })).toMatchObject({ ok: true });
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('waybill')).toBe('29260010951532');
  });

  it('refuses an allowed order paired with a different waybill, without calling Delhivery', async () => {
    expect(await getLiveTracking(actor(), { orderId: 182933, waybill: 'AWB-B' })).toMatchObject({ ok: false, status: 400, error: expect.stringMatching(/does not belong to this order/) });
    expect(await getLiveTracking(actor(), { orderId: 182933, waybill: 'AWB-NORTH' })).toMatchObject({ ok: false, status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('accepts an order ID with its own waybill', async () => {
    expect(await getLiveTracking(actor(), { orderId: 182933, waybill: '29260010951532' })).toMatchObject({ ok: true });
  });

  it('refuses tracking data Delhivery returned for another waybill', async () => {
    const other = delhiveryShipment();
    other.ShipmentData[0].Shipment.AWB = 'SOMETHING-ELSE';
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => other });
    expect(await getLiveTracking(actor(), { orderId: 182933 })).toMatchObject({ ok: false, status: 502 });
  });

  it("never tracks another tenant's waybill", async () => {
    expect(await getLiveTracking(actor(), { waybill: 'AWB-B' })).toMatchObject({ ok: false, status: 404 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps child users to their sub-group's orders", async () => {
    (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue({ subGroups: { name: 'south' } });
    expect(await getLiveTracking(actor(UserRole.CHILD_USER), { waybill: 'AWB-NORTH' })).toMatchObject({ ok: false, status: 404 });
  });

  it('explains that other couriers have no live tracking', async () => {
    expect(await getLiveTracking(actor(), { orderId: 5 })).toMatchObject({ ok: false, status: 400, error: expect.stringMatching(/only available for Delhivery/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails clearly without a Delhivery key', async () => {
    (getDelhiveryApiKey as jest.Mock).mockResolvedValue('');
    expect(await getLiveTracking(actor(), { waybill: '29260010951532' })).toMatchObject({ ok: false, status: 400, error: expect.stringMatching(/API key not found/) });
  });

  it('reports Delhivery errors and unknown waybills', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, statusText: 'Unavailable', text: async () => 'down' });
    expect(await getLiveTracking(actor(), { waybill: '29260010951532' })).toMatchObject({ ok: false, status: 502 });
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ShipmentData: [] }) });
    expect(await getLiveTracking(actor(), { waybill: '29260010951532' })).toMatchObject({ ok: false, status: 404 });
  });
});

describe('GET /api/tracking/delhivery (website)', () => {
  beforeEach(() => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('user'));
  });

  it('keeps the shape the tracking modal reads', async () => {
    const response = await trackingRoute(signedRequest({}, { url: 'http://localhost/api/tracking/delhivery?waybill=29260010951532' }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      data: { waybill: '29260010951532', current_status: 'In Transit', current_location: 'Vijayawada_Hub', tracking_events: expect.any(Array) },
    });
    expect(body.data.tracking_events[0]).toEqual({ status: 'Scan 0', status_description: 'Step 0', location: 'Hub 0', timestamp: expect.any(String), remarks: 'X0' });
  });

  it('requires a waybill', async () => {
    const response = await trackingRoute(signedRequest({}, { url: 'http://localhost/api/tracking/delhivery' }));
    expect(response.status).toBe(400);
  });
});

describe('track_shipment_live (MCP)', () => {
  it('returns the live status with the most recent scans first, capped at 25', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => delhiveryShipment(40) });
    const { structured } = await executeMcpTool(principal(), 'track_shipment_live', { trackingId: '29260010951532' });
    const live = structured as { source: string; currentStatus: string; recentEvents: Array<{ status: string }>; totalEvents: number };

    expect(live).toMatchObject({ source: 'delhivery_live', currentStatus: 'In Transit', totalEvents: 40 });
    expect(live.recentEvents).toHaveLength(25);
    expect(live.recentEvents[0].status).toBe('Scan 39');
  });

  it('rejects an order ID combined with a waybill from elsewhere', async () => {
    await expect(executeMcpTool(principal(), 'track_shipment_live', { orderId: 182933, trackingId: 'AWB-B' })).rejects.toMatchObject({ code: 'invalid_params' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('reports a missing order as not found', async () => {
    await expect(executeMcpTool(principal(), 'track_shipment_live', { trackingId: 'AWB-B' })).rejects.toMatchObject({ code: 'not_found' });
  });

  it('needs tracking:read', async () => {
    await expect(executeMcpTool(principal(['orders:read']), 'track_shipment_live', { orderId: 182933 })).rejects.toMatchObject({ code: 'insufficient_scope' });
  });

  it('is listed as read-only but reaching outside Scan2Ship', () => {
    const server = createMcpServer(principal()) as unknown as { _registeredTools: Record<string, { annotations?: Record<string, boolean> }> };
    expect(server._registeredTools.track_shipment_live.annotations).toMatchObject({ readOnlyHint: true, openWorldHint: true });
  });
});
