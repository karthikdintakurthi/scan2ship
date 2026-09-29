/**
 * @jest-environment node
 *
 * Creating a Delhivery shipment is not idempotent: a retry after an unknown
 * outcome can book a second waybill. The booking is sent once; only an explicit
 * rejection counts as a failure. Cancellation, which is safe to repeat, retries.
 */
jest.mock('@/lib/pickup-location-config', () => ({ getDelhiveryApiKey: jest.fn().mockResolvedValue('test-key') }));

import { DelhiveryOutcomeUnknownError, DelhiveryService } from '@/lib/delhivery';

const fetchMock = jest.fn();
const ORDER = {
  clientId: 'client-a',
  pickup_location: 'main',
  name: 'Ada',
  address: '12 MG Road',
  pincode: '560038',
  city: 'Bengaluru',
  state: 'KA',
  country: 'India',
  mobile: '9876543210',
  reference_number: 'REF-1',
  is_cod: false,
  package_value: 1000,
  weight: 400,
  total_items: 1,
};

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    headers: new Headers(),
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

let service: DelhiveryService;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = fetchMock as never;
  service = new DelhiveryService();
  // Skip real backoff waits for the retrying cancel path
  jest.spyOn(global, 'setTimeout').mockImplementation(((fn: () => void) => { fn(); return 0; }) as never);
});

afterEach(() => jest.restoreAllMocks());

describe('creating a shipment', () => {
  it('books once and returns the waybill', async () => {
    fetchMock.mockResolvedValue(reply(200, { success: true, packages: [{ waybill: 'AWB-1', refnum: 'REF-1' }] }));
    await expect(service.createOrder(ORDER)).resolves.toMatchObject({ success: true, waybill_number: 'AWB-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    ['a network failure', () => fetchMock.mockRejectedValue(new TypeError('fetch failed'))],
    ['a timeout', () => fetchMock.mockRejectedValue(Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' }))],
    ['a 5xx reply', () => fetchMock.mockResolvedValue(reply(503, 'Service Unavailable'))],
    ['an unreadable success reply', () => fetchMock.mockResolvedValue({ ...reply(200, null), json: async () => { throw new SyntaxError('bad json'); } })],
  ])('treats %s as an unknown outcome and never retries', async (_case, arrange) => {
    arrange();
    await expect(service.createOrder(ORDER)).rejects.toBeInstanceOf(DelhiveryOutcomeUnknownError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a 4xx reply', reply(400, { error: 'bad pincode' })],
    ['an explicit Delhivery rejection', reply(200, { success: false, packages: [{ status: 'Fail', remarks: ['Pincode not serviceable'] }] })],
  ])('treats %s as a definite failure, sent once', async (_case, response) => {
    fetchMock.mockResolvedValue(response);
    const error = await service.createOrder(ORDER).catch((e) => e);
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(DelhiveryOutcomeUnknownError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('cancelling a shipment', () => {
  it('retries transient failures, since cancelling twice is harmless', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValue(reply(200, { status: true }));
    await expect(service.cancelOrder('AWB-1', 'main', 'client-a')).resolves.toMatchObject({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a rejection', async () => {
    fetchMock.mockResolvedValue(reply(400, { error: 'not cancellable' }));
    await expect(service.cancelOrder('AWB-1', 'main', 'client-a')).resolves.toMatchObject({ success: false });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
