/**
 * @jest-environment node
 *
 * Pickups: the shared Delhivery pickup service (used by the website route) and
 * the MCP prepare_pickup / schedule_pickup flow.
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

import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { requestPickups } from '@/lib/application/pickups';
import { preparePickup, schedulePickup } from '@/lib/application/pickup-operations';
import { createShipment } from '@/lib/application/shipments';
import { approvedScopes } from '@/lib/mcp/oauth';
import { createMcpServer } from '@/lib/mcp/server';
import type { McpPrincipal } from '@/lib/mcp/principal';
import { authUserRow, signedRequest } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';
import { POST as pickupRoute } from '@/app/api/pickup-request/route';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const fetchMock = jest.fn();

const LOCATIONS = [
  { value: 'main', label: 'Main Warehouse', delhiveryApiKey: 'key-main', clientId: 'client-a', id: 'p1' },
  { value: 'branch', label: 'Branch', delhiveryApiKey: 'key-branch', clientId: 'client-a', id: 'p2' },
  { value: 'nokey', label: 'No Key Store', delhiveryApiKey: null, clientId: 'client-a', id: 'p3' },
  { value: 'other', label: 'Other Tenant', delhiveryApiKey: 'key-b', clientId: 'client-b', id: 'p9' },
];

function actor(role = UserRole.USER, clientId = 'client-a'): AuthenticatedUser {
  return {
    id: 'user-a',
    email: 'a@client-a.test',
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

const principal = (user = actor()): McpPrincipal => ({
  requestId: 'r', tenantId: user.clientId, userId: user.id, grantId: 'g', oauthClientId: 'c',
  scopes: ['settings:read', 'pickups:create'], role: user.role, user,
});

function delhiveryReply(status: number, body: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

let operations: Map<string, Record<string, any>>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = fetchMock as never;
  process.env.MCP_WRITES_ENABLED = 'true';
  // 2026-10-01 12:00 IST
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'setInterval', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-10-01T06:30:00Z'));

  (prisma.pickup_locations.findMany as jest.Mock).mockImplementation(async ({ where }) => {
    const { value, ...rest } = where ?? {};
    return LOCATIONS.filter((row) => matchesWhere(row, rest) && (!value?.in || value.in.includes(row.value)));
  });
  (prisma.pickup_requests.create as jest.Mock).mockImplementation(async ({ data }) => data);
  fetchMock.mockResolvedValue(delhiveryReply(201, { pickup_id: 555 }));

  operations = new Map();
  const ops = prisma.shipment_operations as unknown as Record<string, jest.Mock>;
  ops.create.mockImplementation(async ({ data }) => {
    const row = { ...data, orderId: null, result: null, error: null, createdAt: new Date(), updatedAt: new Date() };
    operations.set(row.id, row);
    return row;
  });
  ops.findFirst.mockImplementation(async ({ where }) => [...operations.values()].find((row) => matchesWhere(row, where)) ?? null);
  ops.update.mockImplementation(async ({ where, data }) => {
    const row = { ...operations.get(where.id)!, ...data, updatedAt: new Date() };
    operations.set(where.id, row);
    return row;
  });
  ops.updateMany.mockImplementation(async ({ where, data }) => {
    const { expiresAt, ...rest } = where;
    const rows = [...operations.values()].filter((row) => matchesWhere(row, rest) && row.expiresAt > expiresAt.gt);
    rows.forEach((row) => operations.set(row.id, { ...row, ...data }));
    return { count: rows.length };
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('requestPickups (shared with the website)', () => {
  const INPUT = { pickupDate: '2026-10-02', pickupTime: '11:00:00', expectedPackageCount: 3, locations: ['main'] };

  it('books with the location key and records the scheduled pickup', async () => {
    const outcome = await requestPickups(actor(), INPUT);

    expect(outcome).toMatchObject({ ok: true, results: [{ pickup_location: 'Main Warehouse', delhivery_request_id: '555', status: 'success' }], errors: [] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://track.delhivery.com/fm/request/new/');
    expect(init.headers.Authorization).toBe('Token key-main');
    expect(JSON.parse(init.body)).toEqual({ pickup_time: '11:00:00', pickup_date: '2026-10-02', pickup_location: 'main', expected_package_count: 3 });
    expect((prisma.pickup_requests.create as jest.Mock).mock.calls[0][0].data).toMatchObject({ clientId: 'client-a', pickup_location: 'main', status: 'scheduled' });
  });

  it('never books another tenant\'s location', async () => {
    const outcome = await requestPickups(actor(), { ...INPUT, locations: ['other'] });
    expect(outcome).toMatchObject({ ok: false, status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('skips a location without a Delhivery key instead of calling with no token', async () => {
    const outcome = await requestPickups(actor(), { ...INPUT, locations: ['main', 'nokey'] });
    expect(outcome).toMatchObject({ ok: true, errors: [{ pickup_location: 'No Key Store', error: expect.stringMatching(/No Delhivery API key/) }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a wallet problem', { prepaid: 'Low balance' }, 'Wallet balance issue: Low balance'],
    ['a nested error', { error: { message: 'Invalid pickup time' } }, 'Invalid pickup time'],
    ['a duplicate pickup', { data: { message: 'Pickup already scheduled' }, pickup_id: 42 }, 'Pickup already scheduled (Pickup ID: 42)'],
    ['a bare string', 'Service unavailable', 'Service unavailable'],
  ])('reports %s from Delhivery', async (_case, body, message) => {
    fetchMock.mockResolvedValue(delhiveryReply(400, body));
    const outcome = await requestPickups(actor(), INPUT);
    expect(outcome).toMatchObject({ ok: true, results: [], errors: [{ error: message, status: 'failed' }] });
    expect(prisma.pickup_requests.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/pickup-request', () => {
  beforeEach(() => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('user'));
  });
  const body = { pickup_date: '2026-10-02', pickup_time: '11:00', expected_package_count: 2, selectedPickupLocations: ['main', 'branch'] };

  it('returns the website response shape, including partial failures', async () => {
    fetchMock.mockResolvedValueOnce(delhiveryReply(201, { pickup_id: 1 })).mockResolvedValueOnce(delhiveryReply(400, { error: 'Closed' }));
    const response = await pickupRoute(signedRequest(body));
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json).toMatchObject({ success: true, results: [{ pickup_location: 'Main Warehouse' }], errors: [{ pickup_location: 'Branch', error: 'Closed' }], scheduled_date: '2026-10-02' });
  });

  it('returns 400 when every location fails', async () => {
    fetchMock.mockResolvedValue(delhiveryReply(400, { error: 'Closed' }));
    const response = await pickupRoute(signedRequest(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe('Failed to schedule pickup with any location');
  });

  it('does not call an uncertain pickup a failure', async () => {
    fetchMock.mockImplementation(async () => { throw new Error('timeout'); });
    const response = await pickupRoute(signedRequest(body));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: expect.stringMatching(/did not confirm/), details: [{ outcome: 'unknown' }, { outcome: 'unknown' }] });
  });

  it('requires the date, time, and package count', async () => {
    const response = await pickupRoute(signedRequest({ ...body, pickup_date: '' }));
    expect(response.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is not available to child users', async () => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow('child_user'));
    expect((await pickupRoute(signedRequest(body))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('MCP pickups', () => {
  const INPUT = { pickupDate: '2026-10-02', pickupTime: '11:00', expectedPackageCount: 3, pickupLocations: ['Main Warehouse'] };

  it('previews without contacting Delhivery', async () => {
    const result = await preparePickup(principal(), INPUT);
    expect(result.preview).toMatchObject({ date: '2026-10-02', time: '11:00 IST', pickupLocations: ['Main Warehouse'], credits: 0 });
    expect(operations.get(result.previewId)).toMatchObject({ type: 'pickup', status: 'previewed', payload: { pickupTime: '11:00:00', locations: ['main'] } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ['a past date', { pickupDate: '2026-09-30' }, /later than now/],
    ['an earlier time today', { pickupDate: '2026-10-01', pickupTime: '11:59' }, /later than now/],
    ['more than 14 days ahead', { pickupDate: '2026-10-16' }, /up to 14 days ahead/],
    ['an impossible date', { pickupDate: '2026-10-32' }, /not a valid date/],
    ['a date that would roll over', { pickupDate: '2026-02-30' }, /not a valid date/],
    ['a location the user cannot use', { pickupLocations: ['Other Tenant'] }, /not available to you/],
    ['a location without a Delhivery key', { pickupLocations: ['No Key Store'] }, /not set up for Delhivery/],
  ])('rejects %s', async (_case, overrides, message) => {
    await expect(preparePickup(principal(), { ...INPUT, ...overrides })).rejects.toMatchObject({ code: 'invalid_params', message: expect.stringMatching(message) });
  });

  it('accepts a later time today', async () => {
    await expect(preparePickup(principal(), { ...INPUT, pickupDate: '2026-10-01', pickupTime: '15:30' })).resolves.toMatchObject({ preview: { time: '15:30 IST' } });
  });

  it('books once per preview, even when confirmed twice', async () => {
    const { previewId } = await preparePickup(principal(), INPUT);
    const first = await schedulePickup(principal(), previewId);
    const again = await schedulePickup(principal(), previewId);

    expect(first).toMatchObject({ type: 'pickup', status: 'succeeded', result: { scheduled: [{ pickupLocation: 'Main Warehouse', delhiveryRequestId: '555' }] } });
    expect(again).toMatchObject({ status: 'succeeded', replayed: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reports partial success when some locations fail', async () => {
    fetchMock.mockResolvedValueOnce(delhiveryReply(201, { pickup_id: 1 })).mockResolvedValueOnce(delhiveryReply(400, { error: 'Closed today' }));
    const { previewId } = await preparePickup(principal(), { ...INPUT, pickupLocations: ['Main Warehouse', 'branch'] });
    expect(await schedulePickup(principal(), previewId)).toMatchObject({ status: 'partially_succeeded', error: 'Branch: Closed today' });
  });

  it('treats a Delhivery network error as uncertain, not failed', async () => {
    fetchMock.mockImplementationOnce(async () => { throw new Error('socket hang up'); });
    const { previewId } = await preparePickup(principal(), INPUT);
    expect(await schedulePickup(principal(), previewId)).toMatchObject({
      status: 'reconciliation_required',
      result: { failed: [], uncertain: [{ pickupLocation: 'Main Warehouse', error: expect.stringMatching(/socket hang up.*may or may not/) }] },
      note: expect.stringMatching(/do not request a duplicate pickup/),
    });
  });

  it.each([
    ['a 5xx reply', () => delhiveryReply(502, { error: 'Bad gateway' })],
    ['an unreadable success reply', () => ({ ...delhiveryReply(201, null), json: async () => { throw new SyntaxError('bad json'); } })],
  ])('treats %s as uncertain', async (_case, reply) => {
    fetchMock.mockResolvedValueOnce(reply());
    const { previewId } = await preparePickup(principal(), INPUT);
    expect(await schedulePickup(principal(), previewId)).toMatchObject({ status: 'reconciliation_required' });
  });

  it('keeps the Delhivery pickup ID when the pickup was accepted but could not be recorded', async () => {
    (prisma.pickup_requests.create as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    const { previewId } = await preparePickup(principal(), INPUT);
    expect(await schedulePickup(principal(), previewId)).toMatchObject({
      status: 'reconciliation_required',
      result: { scheduled: [], uncertain: [{ pickupLocation: 'Main Warehouse', delhiveryRequestId: '555', error: expect.stringMatching(/accepted the pickup \(ID 555\)/) }] },
    });
  });

  it('keeps per-location IDs when one location is uncertain and another scheduled', async () => {
    fetchMock.mockResolvedValueOnce(delhiveryReply(201, { pickup_id: 1 })).mockImplementationOnce(async () => { throw new Error('timeout'); });
    const { previewId } = await preparePickup(principal(), { ...INPUT, pickupLocations: ['Main Warehouse', 'Branch'] });
    expect(await schedulePickup(principal(), previewId)).toMatchObject({
      status: 'reconciliation_required',
      result: { scheduled: [{ pickupLocation: 'Main Warehouse', delhiveryRequestId: '1' }], uncertain: [{ pickupLocation: 'Branch' }] },
    });
  });

  it('still reports a Delhivery rejection as a definite failure', async () => {
    fetchMock.mockResolvedValueOnce(delhiveryReply(400, { error: 'Closed today' }));
    const { previewId } = await preparePickup(principal(), INPUT);
    expect(await schedulePickup(principal(), previewId)).toMatchObject({ status: 'failed', result: { uncertain: [] } });
  });

  it('marks an unexpected failure mid-booking for reconciliation, not retry', async () => {
    const { previewId } = await preparePickup(principal(), INPUT);
    const findMany = prisma.pickup_locations.findMany as jest.Mock;
    // The confirmation re-check passes; the booking step then fails
    findMany.mockImplementationOnce(findMany.getMockImplementation()!).mockRejectedValueOnce(new Error('db down'));
    const result = await schedulePickup(principal(), previewId);
    expect(result).toMatchObject({ status: 'reconciliation_required', note: expect.stringMatching(/do not request a duplicate pickup/) });
    expect(await schedulePickup(principal(), previewId)).toMatchObject({ status: 'reconciliation_required', replayed: true });
  });

  it('refuses a location that stopped being available after the preview, without calling Delhivery', async () => {
    const { previewId } = await preparePickup(principal(), { ...INPUT, pickupLocations: ['Main Warehouse', 'Branch'] });
    const findMany = prisma.pickup_locations.findMany as jest.Mock;
    findMany.mockResolvedValueOnce([LOCATIONS[0]]);

    const result = await schedulePickup(principal(), previewId);
    expect(result).toMatchObject({ status: 'failed', error: 'No longer available to you: branch', hint: expect.stringMatching(/Nothing was sent/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fails without booking when the re-check itself cannot run', async () => {
    const { previewId } = await preparePickup(principal(), INPUT);
    (prisma.pickup_locations.findMany as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    expect(await schedulePickup(principal(), previewId)).toMatchObject({ status: 'failed', error: expect.stringMatching(/Could not re-check/) });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps shipment and pickup previews apart', async () => {
    const { previewId: pickupId } = await preparePickup(principal(), INPUT);
    const shipmentPrincipal = { ...principal(), scopes: ['shipments:create' as const] };
    await expect(createShipment(shipmentPrincipal, pickupId)).rejects.toMatchObject({ code: 'not_found' });

    operations.set('ship_x', { ...operations.get(pickupId)!, id: 'ship_x', type: 'shipment' });
    await expect(schedulePickup(principal(), 'ship_x')).rejects.toMatchObject({ code: 'not_found' });
  });

  it('is refused when writes are switched off', async () => {
    process.env.MCP_WRITES_ENABLED = 'false';
    await expect(preparePickup(principal(), INPUT)).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('offers pickups:create to users but not child users, as on the website', () => {
    expect(approvedScopes(null, ['pickups:create'], { role: UserRole.USER })).toContain('pickups:create');
    expect(approvedScopes(null, ['pickups:create'], { role: UserRole.CHILD_USER })).not.toContain('pickups:create');
  });

  it('lists the pickup tools and operation status for pickups:create', () => {
    const server = createMcpServer(principal()) as unknown as { _registeredTools: Record<string, unknown> };
    expect(Object.keys(server._registeredTools).sort()).toEqual([
      'get_account_context',
      'get_shipment_operation',
      'list_shipping_options',
      'prepare_pickup',
      'schedule_pickup',
    ]);
  });
});

