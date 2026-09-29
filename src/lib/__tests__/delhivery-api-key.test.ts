/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { pickup_locations: { findFirst: jest.fn() } },
}));

// Any code path that constructs its own client must hit the same fake data
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    pickup_locations: require('@/lib/prisma').prisma.pickup_locations,
    $disconnect: jest.fn(),
  })),
}));

import { prisma } from '@/lib/prisma';
import { matchesWhere } from '@/test-utils/prisma-where';
import { getDelhiveryApiKey, defaultPickupLocationConfig } from '@/lib/pickup-location-config';
import { delhiveryTrackingService } from '@/lib/delhivery-tracking';

const findPickup = prisma.pickup_locations.findFirst as jest.Mock;
const fetchMock = global.fetch as jest.Mock;

const PICKUP_LOCATIONS = [
  { clientId: 'client-a', value: 'Main Warehouse', delhiveryApiKey: 'key-a' },
  { clientId: 'client-b', value: 'Main Warehouse', delhiveryApiKey: 'key-b' },
  { clientId: 'client-a', value: 'Wrapped', delhiveryApiKey: "const clientKeyD = 'key-wrapped';" },
  { clientId: 'client-a', value: 'No Key', delhiveryApiKey: null },
  { clientId: 'client-a', value: 'Odd Snippet', delhiveryApiKey: "clientKeyD = '" },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  findPickup.mockImplementation(async ({ where }) => PICKUP_LOCATIONS.find((row) => matchesWhere(row, where)) ?? null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getDelhiveryApiKey', () => {
  it("returns the key for the caller tenant's pickup location, matching the name case-insensitively", async () => {
    expect(await getDelhiveryApiKey('main warehouse', 'client-a')).toBe('key-a');
    expect(await getDelhiveryApiKey('Main Warehouse', 'client-b')).toBe('key-b');
    expect(findPickup.mock.calls[0][0].where).toMatchObject({ clientId: 'client-a' });
  });

  it.each([[''], [undefined as unknown as string], [null as unknown as string]])(
    'fails closed without querying when the tenant is %p',
    async (clientId) => {
      expect(await getDelhiveryApiKey('Main Warehouse', clientId)).toBe('');
      expect(findPickup).not.toHaveBeenCalled();
    }
  );

  it('fails closed when the pickup location is missing', async () => {
    expect(await getDelhiveryApiKey('', 'client-a')).toBe('');
    expect(findPickup).not.toHaveBeenCalled();
  });

  it("does not fall back to another tenant's location with the same name", async () => {
    expect(await getDelhiveryApiKey('Main Warehouse', 'client-c')).toBe('');
  });

  it('returns an empty string when the location has no key', async () => {
    expect(await getDelhiveryApiKey('No Key', 'client-a')).toBe('');
  });

  it('extracts keys saved inside a JavaScript snippet', async () => {
    expect(await getDelhiveryApiKey('Wrapped', 'client-a')).toBe('key-wrapped');
  });

  it('returns the stored value unchanged when a snippet has no quoted key', async () => {
    expect(await getDelhiveryApiKey('Odd Snippet', 'client-a')).toBe("clientKeyD = '");
  });

  it('returns an empty string when the database lookup fails', async () => {
    findPickup.mockRejectedValue(new Error('connection refused'));
    expect(await getDelhiveryApiKey('Main Warehouse', 'client-a')).toBe('');
  });

  it('never logs the key', async () => {
    expect(await getDelhiveryApiKey('Main Warehouse', 'client-a')).toBe('key-a');
    expect(await getDelhiveryApiKey('Wrapped', 'client-a')).toBe('key-wrapped');
    const logged = [console.log, console.warn, console.error]
      .flatMap((fn) => (fn as jest.Mock).mock.calls.flat())
      .join(' ');
    expect(logged).not.toContain('key-a');
    expect(logged).not.toContain('key-wrapped');
  });
});

describe('defaultPickupLocationConfig', () => {
  it('does not ship a Delhivery API key in source', () => {
    expect(defaultPickupLocationConfig.delhiveryApiKey).toBe('');
  });
});

describe('delhiveryTrackingService.getBulkTrackingDetails', () => {
  function jsonResponse(body: unknown, ok = true, status = 200) {
    return {
      ok,
      status,
      statusText: ok ? 'OK' : 'Error',
      headers: { entries: () => [] },
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  }

  const shipment = (awb: string, status: string) => ({ Shipment: { AWB: awb, Status: { Status: status, Instructions: status } } });

  it('tags every successful result with the waybill Delhivery returned it for', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ShipmentData: [shipment('AWB-2', 'In Transit'), shipment('AWB-1', 'Delivered')] }));

    const results = await delhiveryTrackingService.getBulkTrackingDetails(['AWB-1', 'AWB-2'], 'key-a');

    expect(results.map((r) => r.trackingId)).toEqual(['AWB-2', 'AWB-1']);
    expect(results.every((r) => r.success && r.data?.tracking_id === r.trackingId)).toBe(true);
  });

  it('tags error results with their waybill when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: 'unauthorized' }, false, 401));

    const results = await delhiveryTrackingService.getBulkTrackingDetails(['AWB-1', 'AWB-2'], 'key-a');

    expect(results).toEqual([
      expect.objectContaining({ success: false, trackingId: 'AWB-1' }),
      expect.objectContaining({ success: false, trackingId: 'AWB-2' }),
    ]);
  });

  it('tags error results with their waybill when the response has no shipment data', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: 'nothing here' }));

    const results = await delhiveryTrackingService.getBulkTrackingDetails(['AWB-9'], 'key-a');

    expect(results).toEqual([expect.objectContaining({ success: false, trackingId: 'AWB-9', error: 'nothing here' })]);
  });
});
