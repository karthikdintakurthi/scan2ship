jest.unmock('jsonwebtoken');

jest.mock('next/server', () => require('@/test-utils/auth-request').nextServerMock);
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));
jest.mock('@prisma/client', () => ({ PrismaClient: jest.fn(() => require('@/lib/prisma').prisma) }));

jest.mock('@/lib/security-middleware', () => ({
  applySecurityMiddleware: jest.fn().mockResolvedValue(null),
  securityHeaders: jest.fn(),
}));
jest.mock('@/lib/credit-service', () => ({
  CreditService: new Proxy({}, { get: () => jest.fn().mockResolvedValue({ balance: 0 }) }),
}));
jest.mock('@/lib/client-credit-costs-service', () => ({
  ClientCreditCostsService: new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }),
}));
jest.mock('@/lib/analytics-service', () => ({
  __esModule: true,
  default: new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }),
}));
jest.mock('@/lib/jwt-secret-manager', () => ({ jwtSecretManager: { getSecretStats: jest.fn(() => ({})) } }));
jest.mock('@/lib/jwt-config', () => ({ enhancedJwtConfig: { getTokenInfo: jest.fn(() => null) } }));
jest.mock('@/lib/database-security', () => ({
  DatabaseConnectionManager: new Proxy({}, { get: () => jest.fn().mockResolvedValue({}) }),
  safeQuery: new Proxy({}, { get: () => jest.fn().mockResolvedValue({ success: true, data: [] }) }),
}));

import { prisma as realPrisma } from '@/lib/prisma';
import { authUserRow, signedRequest } from '@/test-utils/auth-request';
import type { createPrismaMock } from '@/test-utils/prisma-mock';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

type Handler = (request: unknown, context?: unknown) => Promise<{ status: number }>;

// Every handler that passed the non-existent UserRole.ADMIN before f0d7b71
const PLATFORM_ADMIN_HANDLERS: Array<[string, string, () => Handler, Record<string, string>?]> = [
  ['GET', '/api/admin/client-configurations', () => require('@/app/api/admin/client-configurations/route').GET],
  ['GET', '/api/admin/credits', () => require('@/app/api/admin/credits/route').GET],
  ['GET', '/api/admin/credits/client-b', () => require('@/app/api/admin/credits/[clientId]/route').GET, { clientId: 'client-b' }],
  ['POST', '/api/admin/credits/client-b', () => require('@/app/api/admin/credits/[clientId]/route').POST, { clientId: 'client-b' }],
  ['PUT', '/api/admin/credits/client-b', () => require('@/app/api/admin/credits/[clientId]/route').PUT, { clientId: 'client-b' }],
  ['GET', '/api/admin/credits/client-b/costs', () => require('@/app/api/admin/credits/[clientId]/costs/route').GET, { clientId: 'client-b' }],
  ['POST', '/api/admin/credits/client-b/costs', () => require('@/app/api/admin/credits/[clientId]/costs/route').POST, { clientId: 'client-b' }],
  ['PUT', '/api/admin/credits/client-b/costs', () => require('@/app/api/admin/credits/[clientId]/costs/route').PUT, { clientId: 'client-b' }],
  ['GET', '/api/admin/credits/client-b/transactions', () => require('@/app/api/admin/credits/[clientId]/transactions/route').GET, { clientId: 'client-b' }],
  ['GET', '/api/admin/database-health', () => require('@/app/api/admin/database-health/route').GET],
  ['GET', '/api/admin/jwt-secrets', () => require('@/app/api/admin/jwt-secrets/route').GET],
  ['GET', '/api/admin/settings/clients/client-b', () => require('@/app/api/admin/settings/clients/[id]/route').GET, { id: 'client-b' }],
  ['PUT', '/api/admin/settings/clients/client-b', () => require('@/app/api/admin/settings/clients/[id]/route').PUT, { id: 'client-b' }],
  ['GET', '/api/admin/system-config', () => require('@/app/api/admin/system-config/route').GET],
  ['POST', '/api/admin/system-config', () => require('@/app/api/admin/system-config/route').POST],
  ['PUT', '/api/admin/system-config', () => require('@/app/api/admin/system-config/route').PUT],
  ['GET', '/api/admin/users', () => require('@/app/api/admin/users/route').GET],
  ['POST', '/api/admin/users', () => require('@/app/api/admin/users/route').POST],
  ['GET', '/api/analytics/platform', () => require('@/app/api/analytics/platform/route').GET],
];

const REQUEST_BODY = {
  amount: 1000,
  description: 'test',
  key: 'SOME_KEY',
  value: 'x',
  name: 'Attacker',
  email: 'attacker@example.test',
  password: 'Passw0rd!Passw0rd!',
  role: 'user',
  clientId: 'client-b',
};

function call([, path, load, params]: (typeof PLATFORM_ADMIN_HANDLERS)[number]) {
  const request = signedRequest(REQUEST_BODY, { url: `http://localhost${path}` });
  return load()(request, params ? { params: Promise.resolve(params) } : undefined);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe.each(PLATFORM_ADMIN_HANDLERS)('%s %s', (...handler) => {
  it.each(['child_user', 'user', 'client_admin'])('returns 403 to %s and writes nothing', async (role) => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role));

    const response = await call(handler);

    expect(response.status).toBe(403);
    expect(prisma.writeCalls()).toEqual([]);
  });

  it.each(['super_admin', 'master_admin'])('lets %s through authorization', async (role) => {
    (prisma.users.findUnique as jest.Mock).mockResolvedValue(authUserRow(role));

    const response = await call(handler);

    expect([401, 403]).not.toContain(response.status);
  });
});
