/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({ prisma: require('@/test-utils/prisma-mock').createPrismaMock() }));

import type { NextRequest } from 'next/server';
import { prisma as realPrisma } from '@/lib/prisma';
import { consumeFixedWindow, getClientIp, getRateLimitStatus, rateLimit } from '@/lib/persistent-rate-limiter';
import type { createPrismaMock } from '@/test-utils/prisma-mock';

const prisma = realPrisma as unknown as ReturnType<typeof createPrismaMock>;

function request(headers: Record<string, string>) {
  return { headers: { get: (name: string) => headers[name.toLowerCase()] ?? null } } as unknown as NextRequest;
}

function keysUsed() {
  return (prisma.rate_limits.findFirst as jest.Mock).mock.calls.map(([args]) => args.where.key);
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
  (prisma.rate_limits.findFirst as jest.Mock).mockResolvedValue(null);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getClientIp', () => {
  it('prefers x-real-ip', () => {
    expect(getClientIp(request({ 'x-real-ip': ' 203.0.113.9 ', 'x-forwarded-for': '198.51.100.1' }))).toBe('203.0.113.9');
  });

  it('uses the first x-forwarded-for entry', () => {
    expect(getClientIp(request({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }))).toBe('198.51.100.1');
  });

  it('falls back to unknown', () => {
    expect(getClientIp(request({}))).toBe('unknown');
    expect(getClientIp(request({ 'x-forwarded-for': ' ' }))).toBe('unknown');
  });
});

describe('tracking rate limit', () => {
  const upsert = () => prisma.rate_limits.upsert as jest.Mock;
  const windowRow = (count: number, startedMsAgo = 1000) => ({ key: 'k', count, windowStart: new Date(Date.now() - startedMsAgo) });

  function upsertKeys() {
    return upsert().mock.calls.map(([args]) => args.where.key);
  }

  beforeEach(() => {
    upsert().mockResolvedValue(windowRow(1));
  });

  it('keys by IP even when a Bearer token is sent, so fake tokens do not get fresh buckets', async () => {
    await rateLimit(request({ authorization: 'Bearer aaaaaaaaaaaaaaaaaaaa', 'x-real-ip': '203.0.113.9' }), 'tracking');
    await rateLimit(request({ authorization: 'Bearer bbbbbbbbbbbbbbbbbbbb', 'x-real-ip': '203.0.113.9' }), 'tracking');

    expect(upsertKeys()).toEqual(['tracking:ip:203.0.113.9', 'tracking:ip:203.0.113.9']);
  });

  it('ignores proxy entries added after the client IP', async () => {
    await rateLimit(request({ 'x-forwarded-for': '198.51.100.1, 10.0.0.1' }), 'tracking');
    await rateLimit(request({ 'x-forwarded-for': '198.51.100.1, 10.0.0.2' }), 'tracking');
    expect(new Set(upsertKeys())).toEqual(new Set(['tracking:ip:198.51.100.1']));
  });

  it('counts with a single atomic increment', async () => {
    await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'tracking');
    expect(upsert().mock.calls[0][0]).toMatchObject({
      create: expect.objectContaining({ count: 1 }),
      update: expect.objectContaining({ count: { increment: 1 } }),
    });
    expect(prisma.rate_limits.findFirst).not.toHaveBeenCalled();
  });

  it('allows 10 lookups per window and blocks the 11th', async () => {
    upsert().mockResolvedValue(windowRow(10));
    expect(await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'tracking')).toMatchObject({ allowed: true, remaining: 0 });

    upsert().mockResolvedValue(windowRow(11));
    const blocked = await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'tracking');
    expect(blocked.allowed).toBe(false);
    expect(blocked.message).toMatch(/Too many requests/);
  });

  it('starts a new window once the old one has passed', async () => {
    const stale = windowRow(50, 16 * 60 * 1000);
    upsert().mockResolvedValue(stale);

    const result = await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'tracking');

    expect(result).toMatchObject({ allowed: true, remaining: 9 });
    expect(prisma.rate_limits.updateMany).toHaveBeenCalledWith({
      where: { key: 'tracking:ip:1.1.1.1', windowStart: stale.windowStart },
      data: expect.objectContaining({ count: 1 }),
    });
  });

  it('fails open when the store is unavailable', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    upsert().mockRejectedValue(new Error('db down'));
    expect((await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'tracking')).allowed).toBe(true);
  });

  it('reports status for the same IP-based key', async () => {
    const status = await getRateLimitStatus(request({ authorization: 'Bearer cccccccccccccccccccc', 'x-real-ip': '203.0.113.9' }), 'tracking');
    expect(keysUsed()).toEqual(['tracking:ip:203.0.113.9']);
    expect(status.limit).toBe(10);
  });
});

describe('signed-in and auth rate limits', () => {
  const upsert = () => prisma.rate_limits.upsert as jest.Mock;

  function jwtFor(userId: string) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ userId })).toString('base64url');
    return `${header}.${payload}.sig`;
  }

  beforeEach(() => {
    upsert().mockResolvedValue({ key: 'k', count: 1, windowStart: new Date() });
  });

  function upsertKeys() {
    return upsert().mock.calls.map(([args]) => args.where.key);
  }

  it('keys signed-in API callers by JWT userId, not the shared header prefix', async () => {
    const tokenA = jwtFor('user-a');
    const tokenB = jwtFor('user-b');
    expect(tokenA.slice(0, 8)).toBe(tokenB.slice(0, 8));

    await rateLimit(request({ authorization: `Bearer ${tokenA}`, 'x-real-ip': '203.0.113.9' }), 'api');
    await rateLimit(request({ authorization: `Bearer ${tokenB}`, 'x-real-ip': '203.0.113.9' }), 'api');

    expect(upsertKeys()).toEqual(['api:user:user-a', 'api:user:user-b']);
  });

  it('keys API keys by a hash of the full token, not a prefix', async () => {
    await rateLimit(request({ authorization: 'Bearer s2s_live_aaaaaaaaaaaa', 'x-real-ip': '203.0.113.9' }), 'api');
    await rateLimit(request({ authorization: 'Bearer s2s_live_bbbbbbbbbbbb', 'x-real-ip': '203.0.113.9' }), 'api');
    const keys = upsertKeys();
    expect(keys[0]).toMatch(/^api:key:[a-f0-9]{16}$/);
    expect(keys[1]).toMatch(/^api:key:[a-f0-9]{16}$/);
    expect(keys[0]).not.toBe(keys[1]);
  });

  it('keys auth (login) by IP so brute force is per caller', async () => {
    await rateLimit(request({ 'x-real-ip': '198.51.100.9' }), 'auth');
    expect(upsertKeys()).toEqual(['auth:ip:198.51.100.9']);
  });

  it('uses the atomic limiter for api traffic', async () => {
    upsert().mockResolvedValue({ key: 'api:user:user-a', count: 100, windowStart: new Date() });
    const allowed = await rateLimit(request({ authorization: `Bearer ${jwtFor('user-a')}` }), 'api');
    expect(allowed).toMatchObject({ allowed: true, remaining: 0 });

    upsert().mockResolvedValue({ key: 'api:user:user-a', count: 101, windowStart: new Date() });
    const blocked = await rateLimit(request({ authorization: `Bearer ${jwtFor('user-a')}` }), 'api');
    expect(blocked.allowed).toBe(false);
  });
});

describe('consumeFixedWindow', () => {
  it('reports the remaining allowance and reset time within the window', async () => {
    const windowStart = new Date(Date.now() - 1000);
    (prisma.rate_limits.upsert as jest.Mock).mockResolvedValue({ key: 'k', count: 3, windowStart });

    const result = await consumeFixedWindow('k', 60_000, 5);

    expect(result).toEqual({ allowed: true, remaining: 2, resetTime: windowStart.getTime() + 60_000 });
  });
});

describe('sign-in and session limits', () => {
  const upsert = () => prisma.rate_limits.upsert as jest.Mock;
  const keys = () => upsert().mock.calls.map(([args]) => args.where.key);

  beforeEach(() => {
    upsert().mockResolvedValue({ key: 'k', count: 1, windowStart: new Date() });
  });

  it('counts token refreshes in their own per-IP bucket, never against sign-in', async () => {
    const ip = { 'x-real-ip': '203.0.113.9' };
    await rateLimit(request(ip), 'auth');
    await rateLimit(request({ ...ip, authorization: 'Bearer aaaaaaaaaaaaaaaaaaaa' }), 'session');
    expect(keys()).toEqual(['auth:ip:203.0.113.9', 'session:ip:203.0.113.9']);
  });

  it('allows 60 refreshes per window', async () => {
    upsert().mockResolvedValue({ key: 'k', count: 60, windowStart: new Date() });
    expect((await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'session')).allowed).toBe(true);
    upsert().mockResolvedValue({ key: 'k', count: 61, windowStart: new Date() });
    expect((await rateLimit(request({ 'x-real-ip': '1.1.1.1' }), 'session')).allowed).toBe(false);
  });
});
