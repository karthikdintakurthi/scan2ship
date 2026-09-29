jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);

jest.mock('@/lib/prisma', () => ({
  prisma: {
    sessions: { findUnique: jest.fn((args) => require('@/test-utils/auth-request').liveSessionFor(args)) },
    users: { findUnique: jest.fn() },
    user_sub_groups: { findFirst: jest.fn() },
    orders: { findFirst: jest.fn() },
    courier_services: { findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
    client_order_configs: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn(), create: jest.fn() },
    client_config: { findUnique: jest.fn() },
  },
}));

// database-health-check constructs its own client; route it to the same fake data
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));

import { prisma } from '@/lib/prisma';
import { UserRole } from '@/lib/auth-middleware';
import { ACTIONS, can, ROLE_ACTIONS } from '@/lib/application/permissions';
import { authUserRow, signedRequest, TEST_USER_ID } from '@/test-utils/auth-request';
import { matchesWhere } from '@/test-utils/prisma-where';
import {
  GET as listCourierServices,
  POST as createCourierService,
  PUT as updateCourierServices,
} from '@/app/api/courier-services/route';
import type { NextRequest } from 'next/server';
import { PUT as updateLogo, DELETE as deleteLogo } from '@/app/api/logo/route';
import { PUT as updateOrderConfig } from '@/app/api/order-config/route';
import { GET as getWaybill } from '@/app/api/orders/[id]/waybill/route';

const findUser = prisma.users.findUnique as jest.Mock;
const findSubGroup = prisma.user_sub_groups.findFirst as jest.Mock;
const findOrder = prisma.orders.findFirst as jest.Mock;

function actAs(role: string, subGroup?: string) {
  findUser.mockResolvedValue(authUserRow(role));
  findSubGroup.mockResolvedValue(subGroup ? { subGroups: { name: subGroup } } : null);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('role actions', () => {
  it('lets child users work with orders but not tenant settings, wallet, or users', () => {
    const child = { role: UserRole.CHILD_USER };
    expect(can(child, 'orders:create')).toBe(true);
    expect(can(child, 'shipments:book')).toBe(true);
    for (const action of ['settings:write', 'credits:read', 'credits:recharge', 'pickups:book', 'users:manage'] as const) {
      expect(can(child, action)).toBe(false);
    }
  });

  it('keeps user management with client admins', () => {
    expect(can({ role: UserRole.USER }, 'settings:write')).toBe(true);
    expect(can({ role: UserRole.USER }, 'users:manage')).toBe(false);
    expect(can({ role: UserRole.CLIENT_ADMIN }, 'users:manage')).toBe(true);
  });

  it('gives each higher role every action of the roles below it', () => {
    const order = [UserRole.CHILD_USER, UserRole.USER, UserRole.CLIENT_ADMIN, UserRole.SUPER_ADMIN, UserRole.MASTER_ADMIN];
    for (let i = 1; i < order.length; i++) {
      for (const action of ROLE_ACTIONS[order[i - 1]]) {
        expect(ROLE_ACTIONS[order[i]].has(action)).toBe(true);
      }
    }
  });

  it('denies every action to an unknown role', () => {
    for (const action of ACTIONS) {
      expect(can({ role: 'legacy_role' as UserRole }, action)).toBe(false);
    }
  });
});

describe('tenant settings writes', () => {
  const cases: Array<[string, () => Promise<{ status: number }>]> = [
    ['POST /api/courier-services', () => createCourierService(signedRequest({ name: 'X', code: 'x' }))],
    ['PUT /api/logo', () => updateLogo(signedRequest({ logoUrl: 'https://example.test/logo.png' }))],
    ['DELETE /api/logo', () => deleteLogo(signedRequest())],
    ['PUT /api/order-config', () => updateOrderConfig(signedRequest({ printmode: 'thermal' }))],
  ];

  it.each(cases)('%s rejects child users', async (_name, call) => {
    actAs('child_user');
    const response = await call();
    expect(response.status).toBe(403);
  });

  it.each(cases)('%s lets regular users past the role check', async (_name, call) => {
    actAs('user');
    const response = await call();
    expect(response.status).not.toBe(403);
  });
});

describe('courier services without a signed-in user', () => {
  // The partner API (API-key auth) was removed; a key-style bearer token is not a session.
  function apiKeyRequest(body: unknown = {}): NextRequest {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      authorization: 'Bearer sk_live_0123456789abcdef',
      'x-api-key': 'sk_live_0123456789abcdef',
    };
    return {
      url: 'http://localhost/api/courier-services',
      nextUrl: new URL('http://localhost/api/courier-services'),
      headers: {
        get: (name: string) => headers[name.toLowerCase()] ?? null,
        forEach: (fn: (value: string, key: string) => void) => Object.entries(headers).forEach(([k, v]) => fn(v, k)),
      },
      cookies: { get: () => undefined },
      json: async () => body,
    } as unknown as NextRequest;
  }

  it.each([
    ['GET', () => listCourierServices(apiKeyRequest())],
    ['POST', () => createCourierService(apiKeyRequest({ name: 'X', code: 'x' }))],
    ['PUT', () => updateCourierServices(apiKeyRequest({ services: [{ id: 'c1', label: 'X', value: 'x' }] }))],
  ])('%s /api/courier-services rejects an API-key-style bearer token with 401', async (_method, call) => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(findUser).not.toHaveBeenCalled();
    expect(prisma.courier_services.create).not.toHaveBeenCalled();
  });
});

describe('GET /api/orders/[id]/waybill', () => {
  const ORDERS = [
    { id: 1, clientId: 'client-a', created_by: TEST_USER_ID, sub_group: null },
    { id: 2, clientId: 'client-a', created_by: 'someone-else', sub_group: 'north' },
    { id: 3, clientId: 'client-a', created_by: 'someone-else', sub_group: 'south' },
    { id: 9, clientId: 'client-b', created_by: 'other', sub_group: null },
  ];

  beforeEach(() => {
    findOrder.mockImplementation(async ({ where }) => ORDERS.find((row) => matchesWhere(row, where)) ?? null);
  });

  function params(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  it('hides orders outside a child user sub-group', async () => {
    actAs('child_user', 'north');
    const response = await getWaybill(signedRequest({}, { url: 'http://localhost/api/orders/3/waybill' }), params('3'));
    expect(response.status).toBe(404);
  });

  it('hides other tenants orders from any role', async () => {
    actAs('client_admin');
    const response = await getWaybill(signedRequest({}, { url: 'http://localhost/api/orders/9/waybill' }), params('9'));
    expect(response.status).toBe(404);
  });

  it('looks orders up with the tenant and sub-group rules', async () => {
    actAs('child_user', 'north');
    await getWaybill(signedRequest({}, { url: 'http://localhost/api/orders/2/waybill' }), params('2'));
    expect(findOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 2, clientId: 'client-a', OR: [{ sub_group: 'north' }, { created_by: TEST_USER_ID }] },
      })
    );
  });

  it('rejects malformed order IDs', async () => {
    actAs('user');
    const response = await getWaybill(signedRequest({}, { url: 'http://localhost/api/orders/2abc/waybill' }), params('2abc'));
    expect(response.status).toBe(404);
    expect(findOrder).not.toHaveBeenCalled();
  });
});
