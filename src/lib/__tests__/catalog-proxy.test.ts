jest.unmock('jsonwebtoken');
jest.unmock('path');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/cross-app-auth', () => ({ getCatalogApiKey: jest.fn() }));

import fs from 'node:fs';
import { prisma as realPrisma } from '@/lib/prisma';
import { getCatalogApiKey } from '@/lib/cross-app-auth';
import { PermissionLevel, ROLE_PERMISSIONS, UserRole } from '@/lib/auth-middleware';
import { inventoryItemsFromOrder, parseCatalogOrderId } from '@/lib/application/catalog-inventory';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import { matchesWhere } from '@/test-utils/prisma-where';
import type { createPrismaMock } from '@/test-utils/prisma-mock';
import { POST as catalogProxy } from '@/app/api/catalog/route';

const { join } = jest.requireActual('path');
const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
const fetchMock = global.fetch as jest.Mock;

const STORED_ITEMS = JSON.stringify([{ product: { sku: 'RING-1' }, quantity: 2 }, { sku: 'EAR-9', quantity: 1 }]);
const ORDERS = [
  { id: 7, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, products: STORED_ITEMS },
  { id: 8, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null, products: null },
  { id: 9, clientId: 'client-b', created_by: 'other', sub_group: null, products: STORED_ITEMS },
];

function actAs(role: string) {
  (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role));
}

function call(action: unknown, data: unknown = {}) {
  return catalogProxy(signedRequest({ action, data }));
}

function catalogReply(ok: boolean, body: unknown, status = ok ? 200 : 409) {
  return { ok, status, json: async () => body, text: async () => JSON.stringify(body) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  actAs('child_user');
  (prisma.orders.findFirst as jest.Mock).mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  (prisma.user_sub_groups.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.clients.findUnique as jest.Mock).mockResolvedValue({ id: 'client-a', slug: 'acme', companyName: 'Acme', name: 'Acme' });
  (getCatalogApiKey as jest.Mock).mockResolvedValue({ catalogApiKey: 'cat-key', catalogClientId: 'cat-1' });
  fetchMock.mockResolvedValue(catalogReply(true, { data: { allItemsAvailable: true } }));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('catalog inventory helpers', () => {
  it.each([
    [{ orderId: 7 }, 7],
    [{ orderId: '7' }, 7],
    [{ orderNumber: 'ORDER-7' }, 7],
    [{ orderId: 'abc' }, null],
    [{ orderNumber: 'REF-7' }, null],
    [{ orderNumber: 7 }, null],
    [{}, null],
    [null, null],
  ])('parseCatalogOrderId(%p) is %p', (data, expected) => {
    expect(parseCatalogOrderId(data)).toBe(expected);
  });

  it('reads items in both stored shapes and defaults the quantity to 1', () => {
    expect(inventoryItemsFromOrder(STORED_ITEMS)).toEqual([{ sku: 'RING-1', quantity: 2 }, { sku: 'EAR-9', quantity: 1 }]);
    expect(inventoryItemsFromOrder([{ sku: 'X' }])).toEqual([{ sku: 'X', quantity: 1 }]);
  });

  it('drops items without a SKU or with an invalid quantity', () => {
    expect(inventoryItemsFromOrder([{ sku: '' }, { product: {} }, { sku: 'A', quantity: -2 }, { sku: 'B', quantity: 1.5 }, null])).toEqual([]);
  });

  it.each([['not json'], [null], [{ sku: 'A' }], [42]])('returns no items for %p', (products) => {
    expect(inventoryItemsFromOrder(products)).toEqual([]);
  });
});

describe('POST /api/catalog', () => {
  it.each(['restore_inventory', 'delete_everything', undefined, 42])('rejects the action %p before any lookup', async (action) => {
    const response = await call(action);
    expect(response.status).toBe(400);
    expect(getCatalogApiKey).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a null body', async () => {
    expect((await catalogProxy(signedRequest(null))).status).toBe(400);
  });

  it('still serves read actions', async () => {
    fetchMock.mockResolvedValue(catalogReply(true, { products: [] }));
    const response = await call('search_products', { query: 'ring' });
    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls[0][0]).toContain('/api/public/products?search=ring');
  });

  it('reduces only the items stored on the order, ignoring items sent by the browser', async () => {
    const response = await call('reduce_inventory', { orderId: 7, items: [{ sku: 'ANYTHING', quantity: 999 }] });

    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/public/inventory/reduce/bulk?client=acme');
    expect(JSON.parse(init.body)).toEqual({
      orders: [{ orderId: 'scan2ship_order_7', items: [{ sku: 'RING-1', quantity: 2 }, { sku: 'EAR-9', quantity: 1 }] }],
      reduceMode: 'strict',
      batchId: 'scan2ship_order_7',
    });
  });

  it("accepts the order form's orderNumber", async () => {
    expect((await call('reduce_inventory', { orderNumber: 'ORDER-7' })).status).toBe(200);
  });

  it("does not touch inventory for another tenant's order", async () => {
    const response = await call('reduce_inventory', { orderId: 9 });
    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires an order', async () => {
    expect((await call('reduce_inventory', { items: [{ sku: 'X', quantity: 1 }] })).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an order with no catalog products', async () => {
    expect((await call('reduce_inventory', { orderId: 8 })).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses inventory changes for a role without WRITE', async () => {
    const original = ROLE_PERMISSIONS[UserRole.CHILD_USER];
    (ROLE_PERMISSIONS as Record<string, PermissionLevel[]>)[UserRole.CHILD_USER] = [PermissionLevel.READ];
    try {
      const response = await call('reduce_inventory', { orderId: 7 });
      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    } finally {
      (ROLE_PERMISSIONS as Record<string, PermissionLevel[]>)[UserRole.CHILD_USER] = original;
    }
  });

  it('reports a missing Catalog mapping after the order check', async () => {
    (getCatalogApiKey as jest.Mock).mockResolvedValue(null);
    const response = await call('reduce_inventory', { orderId: 7 });
    expect(response.status).toBe(400);
    expect((await response.json()).requiresSetup).toBe(true);
  });

  it('falls back to the session client when the full client lookup fails or finds nothing', async () => {
    (prisma.clients.findUnique as jest.Mock).mockRejectedValueOnce(new Error('db down'));
    expect((await call('reduce_inventory', { orderId: 7 })).status).toBe(200);

    (prisma.clients.findUnique as jest.Mock).mockResolvedValueOnce(null);
    expect((await call('reduce_inventory', { orderId: 7 })).status).toBe(200);
  });

  it('generates a slug from the company name when the tenant has none, and rejects an empty one', async () => {
    (prisma.clients.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'client-a', slug: null, companyName: 'Acme Jewels!', name: 'A' });
    await call('reduce_inventory', { orderId: 7 });
    expect(fetchMock.mock.calls[0][0]).toContain('client=acme-jewels');

    (prisma.clients.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'client-a', slug: null, companyName: '!!!', name: '' });
    expect((await call('reduce_inventory', { orderId: 7 })).status).toBe(400);

    (prisma.clients.findUnique as jest.Mock).mockResolvedValueOnce({ id: 'client-a', slug: null, companyName: null, name: null });
    await call('reduce_inventory', { orderId: 7 });
    expect(fetchMock.mock.calls.at(-1)[0]).toContain('client=default-client');
  });

  it('passes Catalog errors through, with a default message', async () => {
    fetchMock.mockResolvedValueOnce(catalogReply(false, { error: 'Insufficient stock' }, 409));
    const first = await call('reduce_inventory', { orderId: 7 });
    expect(first.status).toBe(409);
    expect((await first.json()).error).toBe('Insufficient stock');

    fetchMock.mockResolvedValueOnce(catalogReply(false, {}, 502));
    expect((await (await call('reduce_inventory', { orderId: 7 })).json()).error).toBe('Failed to reduce inventory');
  });

  it('returns 500 when the Catalog request throws', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNREFUSED'));
    expect((await call('reduce_inventory', { orderId: 7 })).status).toBe(500);
  });
});

describe('OrderForm', () => {
  it('asks the server to reduce inventory for the new order instead of sending items', () => {
    const source = fs.readFileSync(join(__dirname, '..', '..', 'components', 'OrderForm.tsx'), 'utf8');
    expect(source).toContain('data: { orderId: result.order.id }');
    expect(source).not.toContain('data: { items: inventoryItems');
  });
});
