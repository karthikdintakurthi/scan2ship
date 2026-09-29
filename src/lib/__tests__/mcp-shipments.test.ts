/**
 * @jest-environment node
 *
 * MCP shipment creation: prepare validates and previews without charging;
 * create turns one confirmed preview into at most one order; failures are
 * reported without double-charging; a kill switch and a daily cap apply.
 */
process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = '*';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/persistent-rate-limiter', () => ({
  consumeFixedWindow: jest.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
}));
jest.mock('@/lib/application/order-creation', () => ({
  ...jest.requireActual('@/lib/application/order-creation'),
  createOrder: jest.fn(),
}));
jest.mock('@/lib/application/shipping', () => ({
  ...jest.requireActual('@/lib/application/shipping'),
  listShippingOptions: jest.fn(),
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { ROLE_PERMISSIONS, UserRole, type AuthenticatedUser } from '@/lib/auth-middleware';
import { createOrder } from '@/lib/application/order-creation';
import { listShippingOptions } from '@/lib/application/shipping';
import { createShipment, getShipmentOperation, prepareShipment, PREVIEW_TTL_MS } from '@/lib/application/shipments';
import { prepareShipmentInputSchema, type PrepareShipmentInput } from '@/lib/application/schemas';
import { approvedScopes } from '@/lib/mcp/oauth';
import { createMcpServer } from '@/lib/mcp/server';
import { executeMcpTool } from '@/lib/mcp/tools';
import type { McpPrincipal } from '@/lib/mcp/principal';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { matchesWhere } from '@/test-utils/prisma-where';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const createOrderMock = createOrder as jest.Mock;

function actor(role: UserRole = UserRole.USER, id = 'user-a', clientId = 'client-a'): AuthenticatedUser {
  return {
    id,
    email: `${id}@${clientId}.test`,
    role,
    clientId,
    isActive: true,
    client: { id: clientId, isActive: true, subscriptionStatus: 'active', subscriptionExpiresAt: null },
    permissions: ROLE_PERMISSIONS[role],
  };
}

function principalFor(user = actor()): McpPrincipal {
  return {
    requestId: 'req-1',
    tenantId: user.clientId,
    userId: user.id,
    grantId: 'grant-a',
    oauthClientId: 'app-1',
    scopes: ['settings:read', 'shipments:create'],
    role: user.role,
    user,
  };
}

const INPUT: PrepareShipmentInput = prepareShipmentInputSchema.parse({
  recipient: { name: 'Ada', mobile: '+91 98765 43210', address: '12 MG Road, Indiranagar', city: 'Bengaluru', state: 'KA', pincode: '560038' },
  package: { weightGrams: 400, packageValueInr: 1200, description: 'Earrings' },
  payment: { mode: 'cod', codAmountInr: 1200 },
  courierCode: 'delhivery',
  pickupLocation: 'Main Warehouse',
});

// In-memory shipment_operations with the semantics the service relies on
type OperationRow = {
  id: string;
  status: string;
  expiresAt: Date;
  updatedAt: Date;
  payload: Record<string, unknown>;
  [field: string]: unknown;
};
let operations: Map<string, OperationRow>;
let clock = 0;

function installOperationStore() {
  operations = new Map();
  const ops = prisma.shipment_operations as unknown as Record<string, jest.Mock>;
  ops.create.mockImplementation(async ({ data }) => {
    const row = { ...data, orderId: null, result: null, error: null, createdAt: new Date(), updatedAt: new Date(Date.now() + clock++) };
    operations.set(row.id, row);
    return row;
  });
  ops.findFirst.mockImplementation(async ({ where }) => [...operations.values()].find((row) => matchesWhere(row, where)) ?? null);
  ops.count.mockImplementation(async ({ where }) => [...operations.values()].filter((row) => matchesWhere(row, where)).length);
  ops.update.mockImplementation(async ({ where, data }) => {
    const row = { ...operations.get(where.id)!, ...data, updatedAt: new Date() };
    operations.set(where.id, row);
    return row;
  });
  ops.updateMany.mockImplementation(async ({ where, data }) => {
    const rows = [...operations.values()].filter((row) => {
      const { expiresAt, ...rest } = where;
      return matchesWhere(row, rest) && (!expiresAt?.gt || row.expiresAt > expiresAt.gt);
    });
    rows.forEach((row) => operations.set(row.id, { ...row, ...data, updatedAt: new Date() }));
    return { count: rows.length };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.MCP_WRITES_ENABLED = 'true';
  delete process.env.MCP_DAILY_SHIPMENT_LIMIT;
  installOperationStore();
  (prisma.client_credits.findUnique as jest.Mock).mockResolvedValue({ balance: 10 });
  (listShippingOptions as jest.Mock).mockResolvedValue({
    pickupLocations: [{ id: 'p1', name: 'Main Warehouse', value: 'main-warehouse' }],
    courierServices: [
      { code: 'delhivery', name: 'Delhivery', isDefault: true, estimatedDays: 3, minWeightGrams: 1, maxWeightGrams: 20000 },
      { code: 'india_post', name: 'India Post', isDefault: false, estimatedDays: 5, minWeightGrams: null, maxWeightGrams: null },
    ],
  });
  createOrderMock.mockResolvedValue({
    ok: true,
    order: { id: 501, reference_number: 'REF-1', tracking_id: 'AWB-1', courier_service: 'delhivery', delhivery_api_status: 'success' },
  });
});

describe('prepare_shipment', () => {
  it('saves a preview in website order shape without charging or booking', async () => {
    const result = await prepareShipment(principalFor(), INPUT);

    expect(result.previewId).toMatch(/^ship_/);
    expect(result.cost).toEqual({ credits: 1, currentBalance: 10, sufficient: true });
    expect(result.preview).toMatchObject({ courier: { code: 'delhivery' }, pickupLocation: 'Main Warehouse', bookedWithCarrier: true });
    expect(createOrderMock).not.toHaveBeenCalled();
    expect(prisma.client_credits.update).not.toHaveBeenCalled();

    const stored = operations.get(result.previewId)!;
    expect(stored).toMatchObject({ status: 'previewed', tenantId: 'client-a', userId: 'user-a', channel: 'mcp' });
    expect(stored.payload).toMatchObject({
      name: 'Ada',
      courier_service: 'delhivery',
      pickup_location: 'main-warehouse',
      weight: 400,
      package_value: 1200,
      is_cod: true,
      cod_amount: 1200,
      product_description: 'Earrings',
    });
    expect(stored.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(PREVIEW_TTL_MS);
  });

  it('reports an insufficient balance in the preview', async () => {
    (prisma.client_credits.findUnique as jest.Mock).mockResolvedValue({ balance: 0 });
    expect((await prepareShipment(principalFor(), INPUT)).cost.sufficient).toBe(false);
  });

  it.each([
    ['an unknown courier', { ...INPUT, courierCode: 'fedex' }, /Unknown or inactive courier/],
    ['a pickup location the user cannot use', { ...INPUT, pickupLocation: 'Other Warehouse' }, /not available to you/],
    ['a package over the courier limit', { ...INPUT, package: { ...INPUT.package, weightGrams: 25000 } }, /at most 20000 g/],
    ['an invalid mobile number', { ...INPUT, recipient: { ...INPUT.recipient, mobile: '12345 67890' } }, /Mobile number/],
  ])('rejects %s', async (_case, input, message) => {
    await expect(prepareShipment(principalFor(), input as PrepareShipmentInput)).rejects.toMatchObject({ code: 'invalid_params', message: expect.stringMatching(message) });
    expect(operations.size).toBe(0);
  });

  it('requires a COD amount for cash on delivery', () => {
    expect(() => prepareShipmentInputSchema.parse({ ...INPUT, payment: { mode: 'cod' } })).toThrow(/codAmountInr/);
  });

  it('is refused when writes are switched off', async () => {
    process.env.MCP_WRITES_ENABLED = 'false';
    await expect(prepareShipment(principalFor(), INPUT)).rejects.toMatchObject({ code: 'forbidden' });
  });
});

describe('create_shipment', () => {
  async function preview(user = actor()) {
    return (await prepareShipment(principalFor(user), INPUT)).previewId;
  }

  it('creates the order from the stored preview', async () => {
    const id = await preview();
    const result = await createShipment(principalFor(), id);

    expect(result).toMatchObject({ status: 'succeeded', orderId: 501, result: { trackingId: 'AWB-1', creditsCharged: 1 } });
    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-a' }),
      operations.get(id)!.payload,
      { creationPattern: 'mcp' }
    );
  });

  it('never creates a second order for the same preview', async () => {
    const id = await preview();
    await createShipment(principalFor(), id);
    const again = await createShipment(principalFor(), id);

    expect(again).toMatchObject({ status: 'succeeded', orderId: 501, replayed: true });
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('lets only one of two concurrent confirmations create the order', async () => {
    const id = await preview();
    let release!: () => void;
    createOrderMock.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({ ok: true, order: { id: 777, reference_number: 'R', tracking_id: null, courier_service: 'delhivery', delhivery_api_status: 'success' } }); })
    );
    const first = createShipment(principalFor(), id);
    await new Promise((resolve) => setImmediate(resolve));
    const second = await createShipment(principalFor(), id);
    release();

    expect(second).toMatchObject({ status: 'creating', replayed: true });
    expect(await first).toMatchObject({ status: 'succeeded', orderId: 777 });
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('refuses an expired preview', async () => {
    const id = await preview();
    operations.get(id)!.expiresAt = new Date(Date.now() - 1000);
    expect(await createShipment(principalFor(), id)).toMatchObject({ status: 'expired', replayed: true });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it("cannot confirm another user's or tenant's preview", async () => {
    const id = await preview(actor(UserRole.USER, 'user-b'));
    await expect(createShipment(principalFor(), id)).rejects.toMatchObject({ code: 'not_found' });
    const otherTenant = await preview(actor(UserRole.USER, 'user-a', 'client-b'));
    await expect(createShipment(principalFor(), otherTenant)).rejects.toMatchObject({ code: 'not_found' });
    expect(createOrderMock).not.toHaveBeenCalled();
  });

  it('reports insufficient credits without creating anything', async () => {
    createOrderMock.mockResolvedValue({ ok: false, status: 402, body: { error: 'Insufficient credits' } });
    const result = await createShipment(principalFor(), await preview());
    expect(result).toMatchObject({ status: 'failed', orderId: null, hint: expect.stringMatching(/recharge/) });
  });

  it('reports a carrier rejection as failed with the credit refunded', async () => {
    createOrderMock.mockResolvedValue({ ok: false, status: 400, body: { error: 'Delhivery API failed', details: 'Pincode not serviceable' } });
    const result = await createShipment(principalFor(), await preview());
    expect(result).toMatchObject({ status: 'failed', error: 'Delhivery API failed: Pincode not serviceable', creditsRefunded: true });
  });

  it('marks an order that exists but lost its carrier details for reconciliation', async () => {
    createOrderMock.mockResolvedValue({ ok: false, status: 500, body: { error: 'Order was created but its carrier details could not be saved', orderId: 88 } });
    const result = await createShipment(principalFor(), await preview());
    expect(result).toMatchObject({ status: 'reconciliation_required', orderId: 88, note: expect.stringMatching(/do not create a duplicate/) });
  });

  it('marks an unexpected failure for reconciliation instead of retrying', async () => {
    createOrderMock.mockRejectedValue(new Error('socket hang up'));
    const id = await preview();
    expect(await createShipment(principalFor(), id)).toMatchObject({ status: 'reconciliation_required' });
    expect(await createShipment(principalFor(), id)).toMatchObject({ status: 'reconciliation_required', replayed: true });
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('enforces the daily limit on assistant-created orders', async () => {
    process.env.MCP_DAILY_SHIPMENT_LIMIT = '1';
    const first = await preview();
    const second = await preview();
    await createShipment(principalFor(), first);
    await expect(createShipment(principalFor(), second)).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(prepareShipment(principalFor(), INPUT)).rejects.toMatchObject({ code: 'rate_limited' });
    expect(createOrderMock).toHaveBeenCalledTimes(1);
  });

  it('reports a creation that stalled mid-request as needing reconciliation', async () => {
    const id = await preview();
    const row = operations.get(id)!;
    operations.set(id, { ...row, status: 'creating', updatedAt: new Date(Date.now() - 5 * 60 * 1000) });
    expect(await getShipmentOperation(principalFor(), id)).toMatchObject({ status: 'reconciliation_required' });
  });
});

describe('scopes and tool listing', () => {
  it('grants shipments:create only when ticked, including to child users', () => {
    expect(approvedScopes(null, [], { role: UserRole.USER })).not.toContain('shipments:create');
    expect(approvedScopes(null, ['shipments:create'], { role: UserRole.CHILD_USER })).toContain('shipments:create');
  });

  function listed(): string[] {
    const server = createMcpServer(principalFor()) as unknown as { _registeredTools: Record<string, { annotations?: Record<string, boolean> }> };
    return Object.keys(server._registeredTools).sort();
  }

  it('lists the shipment tools only while writes are enabled', () => {
    expect(listed()).toEqual(['create_shipment', 'get_account_context', 'get_shipment_operation', 'list_shipping_options', 'prepare_shipment']);
    process.env.MCP_WRITES_ENABLED = 'false';
    expect(listed()).toEqual(['get_account_context', 'list_shipping_options']);
  });

  it('marks create_shipment as acting on the outside world', () => {
    const server = createMcpServer(principalFor()) as unknown as { _registeredTools: Record<string, { annotations?: Record<string, boolean> }> };
    expect(server._registeredTools.create_shipment.annotations).toMatchObject({ readOnlyHint: false, openWorldHint: true, idempotentHint: true });
    expect(server._registeredTools.prepare_shipment.annotations).toMatchObject({ readOnlyHint: false, openWorldHint: false });
  });

  it('requires shipments:create to call the tools', async () => {
    const principal = { ...principalFor(), scopes: ['orders:read' as const] };
    await expect(executeMcpTool(principal, 'prepare_shipment', INPUT)).rejects.toMatchObject({ code: 'insufficient_scope' });
  });
});
