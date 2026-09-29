/**
 * @jest-environment node
 *
 * DTDC tracking numbers: the next unused number is taken only when an order is
 * created, never twice, and is returned if the order is not created.
 */
process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/application/order-creation', () => ({
  ...jest.requireActual('@/lib/application/order-creation'),
  createOrder: jest.fn(),
}));
jest.mock('@/lib/application/shipping', () => ({
  ...jest.requireActual('@/lib/application/shipping'),
  listShippingOptions: jest.fn(),
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole } from '@/lib/auth-middleware';
import { claimDtdcSlip, isDtdcCourier, peekNextDtdcSlip, releaseDtdcSlip } from '@/lib/application/dtdc-slips';
import { createOrder } from '@/lib/application/order-creation';
import { listShippingOptions } from '@/lib/application/shipping';
import { createShipment, prepareShipment } from '@/lib/application/shipments';
import { prepareShipmentInputSchema } from '@/lib/application/schemas';
import type { McpPrincipal } from '@/lib/mcp/principal';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const createOrderMock = createOrder as jest.Mock;

let config: Map<string, string>;
let operations: Map<string, Record<string, unknown>>;

function setSlips(courier: string, unused: string, used = '') {
  config.set(`client-a|${courier}_slips_unused`, unused);
  config.set(`client-a|${courier}_slips_used`, used);
}
const slips = (courier = 'dtdc') => ({
  unused: config.get(`client-a|${courier}_slips_unused`),
  used: config.get(`client-a|${courier}_slips_used`),
});

function installStores() {
  config = new Map();
  const cc = prisma.client_config as unknown as Record<string, jest.Mock>;
  cc.findMany.mockImplementation(async ({ where }) =>
    [...config.entries()]
      .map(([k, value]) => ({ clientId: k.split('|')[0], key: k.split('|')[1], value }))
      .filter((row) => row.clientId === where.clientId && where.key.in.includes(row.key))
  );
  cc.updateMany.mockImplementation(async ({ where, data }) => {
    const k = `${where.clientId}|${where.key}`;
    if (!config.has(k) || ('value' in where && config.get(k) !== where.value)) return { count: 0 };
    config.set(k, data.value);
    return { count: 1 };
  });

  operations = new Map();
  const ops = prisma.shipment_operations as unknown as Record<string, jest.Mock>;
  ops.create.mockImplementation(async ({ data }) => {
    const row = { ...data, orderId: null, result: null, error: null, createdAt: new Date(), updatedAt: new Date() };
    operations.set(row.id, row);
    return row;
  });
  ops.findFirst.mockImplementation(async ({ where }) => [...operations.values()].find((row) => matchesWhere(row, where)) ?? null);
  ops.count.mockResolvedValue(0);
  ops.update.mockImplementation(async ({ where, data }) => {
    const row = { ...operations.get(where.id)!, ...data, updatedAt: new Date() };
    operations.set(where.id, row);
    return row;
  });
  ops.updateMany.mockImplementation(async ({ where, data }) => {
    const row = operations.get(where.id);
    if (!row || row.status !== where.status) return { count: 0 };
    operations.set(where.id, { ...row, ...data });
    return { count: 1 };
  });
}

const user = {
  id: 'user-a',
  email: 'a@client-a.test',
  role: UserRole.USER,
  clientId: 'client-a',
  isActive: true,
  client: { id: 'client-a', isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
  permissions: ROLE_PERMISSIONS[UserRole.USER],
};
const principal: McpPrincipal = {
  requestId: 'r', tenantId: 'client-a', userId: 'user-a', grantId: 'g', oauthClientId: 'c',
  scopes: ['shipments:create'], role: UserRole.USER, user,
};

const input = (overrides: Record<string, unknown> = {}) =>
  prepareShipmentInputSchema.parse({
    recipient: { name: 'Sneha', mobile: '8143491444', address: 'Flat 501, Coaxial Road, Sajjapuram', city: 'Tanuku', state: 'Andhra Pradesh', pincode: '534211' },
    package: { weightGrams: 500, packageValueInr: 1000 },
    payment: { mode: 'prepaid' },
    courierCode: 'dtdc',
    pickupLocation: 'main',
    ...overrides,
  });

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MCP_WRITES_ENABLED = 'true';
  installStores();
  (prisma.client_credits.findUnique as jest.Mock).mockResolvedValue({ balance: 5 });
  (listShippingOptions as jest.Mock).mockResolvedValue({
    pickupLocations: [{ id: 'p', name: 'Main', value: 'main' }],
    courierServices: ['dtdc', 'dtdc_plus', 'india_post', 'delhivery'].map((code) => ({ code, name: code, isDefault: false, estimatedDays: 3, minWeightGrams: null, maxWeightGrams: null })),
  });
  createOrderMock.mockImplementation(async (_user, data) => ({
    ok: true,
    order: { id: 900, reference_number: 'REF', tracking_id: data.tracking_id ?? null, courier_service: data.courier_service, delhivery_api_status: null },
  }));
});

describe('slip helpers', () => {
  it('recognises the DTDC variants', () => {
    expect(['dtdc', 'DTDC_COD', 'dtdc_plus'].map(isDtdcCourier)).toEqual([true, true, true]);
    expect(isDtdcCourier('india_post')).toBe(false);
  });

  it('peeks without taking', async () => {
    setSlips('dtdc', 'D100, D101');
    expect(await peekNextDtdcSlip('client-a', 'dtdc')).toBe('D100');
    expect(slips().unused).toBe('D100, D101');
  });

  it('moves the first unused number to used', async () => {
    setSlips('dtdc', 'D100, D101', 'D099');
    expect(await claimDtdcSlip('client-a', 'dtdc')).toBe('D100');
    expect(slips()).toEqual({ unused: 'D101', used: 'D099, D100' });
  });

  it('claims a specific number only if it is unused', async () => {
    setSlips('dtdc', 'D100, D101');
    expect(await claimDtdcSlip('client-a', 'dtdc', 'D101')).toBe('D101');
    expect(await claimDtdcSlip('client-a', 'dtdc', 'X999')).toBeNull();
    expect(slips()).toEqual({ unused: 'D100', used: 'D101' });
  });

  it('never hands out the same number when the lists change concurrently', async () => {
    setSlips('dtdc', 'D100, D101');
    const cc = prisma.client_config as unknown as Record<string, jest.Mock>;
    const original = cc.updateMany.getMockImplementation()!;
    // Another order takes D100 between our read and our write
    cc.updateMany.mockImplementationOnce(async (args) => {
      config.set('client-a|dtdc_slips_unused', 'D101');
      config.set('client-a|dtdc_slips_used', 'D100');
      return original(args);
    });
    expect(await claimDtdcSlip('client-a', 'dtdc')).toBe('D101');
    expect(slips()).toEqual({ unused: '', used: 'D100, D101' });
  });

  it('returns nothing when no numbers are left', async () => {
    setSlips('dtdc', '');
    expect(await claimDtdcSlip('client-a', 'dtdc')).toBeNull();
  });

  it('puts a released number back at the front', async () => {
    setSlips('dtdc', 'D101', 'D099, D100');
    await releaseDtdcSlip('client-a', 'dtdc', 'D100');
    expect(slips()).toEqual({ unused: 'D100, D101', used: 'D099' });
  });
});

describe('shipments with DTDC', () => {
  it('previews the next unused number without taking it, then takes it on creation', async () => {
    setSlips('dtdc', 'D100, D101');
    const preview = await prepareShipment(principal, input());
    expect(preview.preview.trackingNumber).toMatch(/^D100 \(next unused DTDC number/);
    expect(slips().unused).toBe('D100, D101');

    const created = await createShipment(principal, preview.previewId);
    expect(created).toMatchObject({ status: 'succeeded', result: { trackingId: 'D100' } });
    expect(createOrderMock.mock.calls[0][1]).toMatchObject({ tracking_id: 'D100' });
    expect(createOrderMock.mock.calls[0][1]).not.toHaveProperty('_assignNextDtdcSlip');
    expect(slips()).toEqual({ unused: 'D101', used: 'D100' });
  });

  it('uses the DTDC variant\'s own list', async () => {
    setSlips('dtdc', 'D100');
    setSlips('dtdc_plus', 'P500');
    const preview = await prepareShipment(principal, input({ courierCode: 'dtdc_plus' }));
    await createShipment(principal, preview.previewId);
    expect(createOrderMock.mock.calls[0][1]).toMatchObject({ tracking_id: 'P500' });
    expect(slips('dtdc').unused).toBe('D100');
  });

  it('creates the order without a tracking number when none are left', async () => {
    setSlips('dtdc', '');
    const preview = await prepareShipment(principal, input());
    expect(preview.preview.trackingNumber).toMatch(/^none: no unused DTDC numbers/);
    const created = await createShipment(principal, preview.previewId);
    expect(created).toMatchObject({ status: 'succeeded' });
    expect(createOrderMock.mock.calls[0][1]).not.toHaveProperty('tracking_id');
  });

  it("uses the user's number and marks it used if it is one of the account's slips", async () => {
    setSlips('dtdc', 'D100, D101');
    const preview = await prepareShipment(principal, input({ trackingNumber: 'D101' }));
    await createShipment(principal, preview.previewId);
    expect(createOrderMock.mock.calls[0][1]).toMatchObject({ tracking_id: 'D101' });
    expect(slips()).toEqual({ unused: 'D100', used: 'D101' });
  });

  it('returns the number when the order is not created', async () => {
    setSlips('dtdc', 'D100, D101');
    createOrderMock.mockResolvedValue({ ok: false, status: 402, body: { error: 'Insufficient credits' } });
    const preview = await prepareShipment(principal, input());
    expect(await createShipment(principal, preview.previewId)).toMatchObject({ status: 'failed' });
    expect(slips()).toEqual({ unused: 'D100, D101', used: '' });
  });

  it('leaves India Post tracking optional and never touches DTDC slips', async () => {
    setSlips('dtdc', 'D100');
    const withNumber = await prepareShipment(principal, input({ courierCode: 'india_post', trackingNumber: 'EE123456789IN' }));
    const without = await prepareShipment(principal, input({ courierCode: 'india_post' }));
    expect(withNumber.preview.trackingNumber).toBe('EE123456789IN');
    expect(without.preview.trackingNumber).toBeNull();
    await createShipment(principal, without.previewId);
    expect(createOrderMock.mock.calls[0][1]).not.toHaveProperty('tracking_id');
    expect(slips().unused).toBe('D100');
  });
});
