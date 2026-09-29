/**
 * @jest-environment node
 */
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn() }));

import { getDelhiveryApiKey } from '@/lib/pickup-location-config';
import { delhiveryService } from '@/lib/delhivery';

const getKey = getDelhiveryApiKey as jest.Mock;
const fetchMock = global.fetch as jest.Mock;

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { entries: () => [] },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  getKey.mockResolvedValue('tenant-key');
  fetchMock.mockResolvedValue(jsonResponse({ status: true }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('delhiveryService.cancelOrder', () => {
  it("cancels with the key of the order's own tenant", async () => {
    const result = await delhiveryService.cancelOrder('AWB-1', 'Main Warehouse', 'client-a');

    expect(result.success).toBe(true);
    expect(getKey).toHaveBeenCalledWith('Main Warehouse', 'client-a');
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/p/edit');
    expect(init.headers.Authorization).toBe('Token tenant-key');
    expect(JSON.parse(init.body)).toEqual({ waybill: 'AWB-1', cancellation: 'true' });
  });

  it('refuses to cancel without a tenant', async () => {
    const result = await delhiveryService.cancelOrder('AWB-1', 'Main Warehouse', '');

    expect(result.success).toBe(false);
    expect(getKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not call Delhivery when the tenant has no key for the location', async () => {
    getKey.mockResolvedValue('');
    const result = await delhiveryService.cancelOrder('AWB-1', 'Main Warehouse', 'client-a');

    expect(result.success).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('Delhivery request logging', () => {
  it('logs header names but never the key or Authorization header', async () => {
    getKey.mockResolvedValue('very-secret-delhivery-key');
    await delhiveryService.cancelOrder('AWB-1', 'Main Warehouse', 'client-a');

    const logged = (console.log as jest.Mock).mock.calls.flat().map(String).join(' ');
    expect(logged).toContain('Header names:');
    expect(logged).not.toContain('very-secret-delhivery-key');
  });
});

describe('delhiveryService.createOrder', () => {
  it('refuses to book a shipment without a tenant', async () => {
    await expect(delhiveryService.createOrder({ pickup_location: 'Main Warehouse', name: 'x' })).rejects.toThrow(/Client ID is required/);
    expect(getKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("looks up the key for the order's tenant", async () => {
    getKey.mockResolvedValue('');
    await expect(
      delhiveryService.createOrder({ clientId: 'client-a', pickup_location: 'Main Warehouse', name: 'x' })
    ).rejects.toThrow(/No Delhivery API key/);
    expect(getKey).toHaveBeenCalledWith('Main Warehouse', 'client-a');
  });
});

describe('delhiveryService.validatePincode', () => {
  it.each([
    ['no pickup location or tenant', undefined, undefined],
    ['a pickup location but no tenant', 'Main Warehouse', undefined],
  ])('does not call Delhivery with %s', async (_label, pickupLocation, clientId) => {
    const result = await delhiveryService.validatePincode('560001', pickupLocation, clientId);

    expect(result.success).toBe(false);
    expect(getKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses the tenant's key when both are provided", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ delivery_codes: [{ postal_code: { city: 'Bengaluru', inc: 'Bangalore_KA (Karnataka)' } }] }));

    const result = await delhiveryService.validatePincode('560001', 'Main Warehouse', 'client-a');

    expect(getKey).toHaveBeenCalledWith('Main Warehouse', 'client-a');
    expect(result).toMatchObject({ success: true, serviceable: true, city: 'Bengaluru' });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Token tenant-key');
  });
});

describe('delhiveryService.getOrderStatus', () => {
  it('has been removed because it looked up keys without a tenant', () => {
    expect((delhiveryService as unknown as Record<string, unknown>).getOrderStatus).toBeUndefined();
  });
});
