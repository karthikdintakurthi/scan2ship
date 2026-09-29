/**
 * @jest-environment node
 *
 * OAuth one-time semantics under concurrency: an authorization code yields
 * tokens once, and a refresh token rotates once, even when used by two
 * requests at the same moment. The store below enforces conditional updates
 * the way PostgreSQL does (the condition is checked when the write happens).
 */
jest.unmock('jsonwebtoken');

process.env.MCP_ENABLED = 'true';
process.env.MCP_TENANT_ALLOWLIST = 'client-a';
process.env.MCP_PUBLIC_BASE_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-purposes-only-32-chars';

jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));

import { prisma as realPrisma } from '@/lib/prisma';
import { exchangeAuthorizationCode, rotateRefreshToken } from '@/lib/mcp/oauth';
import { sha256Hex, sha256S256 } from '@/lib/mcp/crypto';
import { mcpResourceUrl } from '@/lib/mcp/config';
import type { createPrismaMock } from '@/test-utils/prisma-mock';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;
type Row = Record<string, unknown>;

const GRANT = { id: 'grant-a', userId: 'user-a', tenantId: 'client-a', oauthClientId: 'app-1', scopes: ['orders:read'], revokedAt: null };
const VERIFIER = 'a-code-verifier-that-is-long-enough-for-pkce-123456';

let codes: Map<string, Row>;
let refreshTokens: Map<string, Row>;
let grant: Row;

/** Yields after a read, so concurrent requests all read before any of them writes. */
const tick = () => new Promise((resolve) => setImmediate(resolve));

function matches(row: Row, where: Row) {
  return Object.entries(where).every(([key, condition]) => {
    if (condition && typeof condition === 'object' && 'gt' in condition) {
      return (row[key] as Date) > (condition as { gt: Date }).gt;
    }
    return row[key] === condition;
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  grant = { ...GRANT };
  codes = new Map();
  refreshTokens = new Map();

  const c = prisma.mcp_authorization_codes as unknown as Record<string, jest.Mock>;
  c.findUnique.mockImplementation(async ({ where }) => {
    // Snapshot at read time, like a database read, then let other requests run
    const row = [...codes.values()].find((r) => r.codeHash === where.codeHash);
    const snapshot = row ? { ...row, grant: { ...grant } } : null;
    await tick();
    return snapshot;
  });
  c.updateMany.mockImplementation(async ({ where, data }) => {
    const row = codes.get(where.id);
    if (!row || !matches(row, where)) return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  });

  const r = prisma.mcp_refresh_tokens as unknown as Record<string, jest.Mock>;
  r.findUnique.mockImplementation(async ({ where }) => {
    const row = [...refreshTokens.values()].find((t) => t.tokenHash === where.tokenHash);
    const snapshot = row ? { ...row, grant: { ...grant } } : null;
    await tick();
    return snapshot;
  });
  r.create.mockImplementation(async ({ data }) => {
    const row = { revokedAt: null, replacedById: null, ...data };
    refreshTokens.set(row.id, row);
    return row;
  });
  r.update.mockImplementation(async ({ where, data }) => Object.assign(refreshTokens.get(where.id)!, data));
  r.updateMany.mockImplementation(async ({ where, data }) => {
    const rows = [...refreshTokens.values()].filter((t) => matches(t, where));
    rows.forEach((t) => Object.assign(t, data));
    return { count: rows.length };
  });
  (prisma.mcp_grants.update as jest.Mock).mockImplementation(async ({ data }) => Object.assign(grant, data));
});

function addCode(code: string) {
  codes.set('code-1', {
    id: 'code-1',
    grantId: grant.id,
    codeHash: sha256Hex(code),
    codeChallenge: sha256S256(VERIFIER),
    redirectUri: 'https://claude.ai/api/mcp/auth_callback',
    resource: mcpResourceUrl(),
    expiresAt: new Date(Date.now() + 60_000),
    consumedAt: null,
  });
}

const exchange = (code: string) =>
  exchangeAuthorizationCode({ code, redirectUri: 'https://claude.ai/api/mcp/auth_callback', clientId: 'app-1', codeVerifier: VERIFIER });

describe('authorization codes', () => {
  it('issue tokens only once when exchanged twice at the same time', async () => {
    addCode('the-code');
    const results = await Promise.allSettled([exchange('the-code'), exchange('the-code')]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(refreshTokens.size).toBe(1);
  });

  it('are rejected when exchanged again later', async () => {
    addCode('the-code');
    await exchange('the-code');
    await expect(exchange('the-code')).rejects.toMatchObject({ code: 'invalid_token' });
    expect(refreshTokens.size).toBe(1);
  });
});

describe('refresh tokens', () => {
  async function issued() {
    addCode('the-code');
    return (await exchange('the-code')).refresh_token;
  }

  it('rotate to exactly one successor', async () => {
    const token = await issued();
    const next = await rotateRefreshToken({ refreshToken: token, clientId: 'app-1' });

    const rows = [...refreshTokens.values()];
    const old = rows.find((t) => t.tokenHash === sha256Hex(token))!;
    expect(old.revokedAt).not.toBeNull();
    expect(old.replacedById).toBe(next.refreshTokenId);
    expect(rows.filter((t) => t.revokedAt === null)).toHaveLength(1);
  });

  it('cannot branch into two live tokens when used twice at the same time', async () => {
    const token = await issued();
    const results = await Promise.allSettled([
      rotateRefreshToken({ refreshToken: token, clientId: 'app-1' }),
      rotateRefreshToken({ refreshToken: token, clientId: 'app-1' }),
    ]);

    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.find((r) => r.status === 'rejected')).toMatchObject({ reason: { message: 'Refresh token reuse detected' } });
    // The second use counts as reuse: the whole family and the grant are revoked
    expect([...refreshTokens.values()].filter((t) => t.revokedAt === null)).toHaveLength(0);
    expect(grant.revokedAt).not.toBeNull();
  });

  it('treat a later replay as reuse and revoke the connection', async () => {
    const token = await issued();
    await rotateRefreshToken({ refreshToken: token, clientId: 'app-1' });
    await expect(rotateRefreshToken({ refreshToken: token, clientId: 'app-1' })).rejects.toMatchObject({ code: 'invalid_token' });
    expect(grant.revokedAt).not.toBeNull();
  });
});
