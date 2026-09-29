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

describe('other rate limits', () => {
  it('still key signed-in callers by token prefix', async () => {
    await rateLimit(request({ authorization: 'Bearer aaaaaaaaaaaaaaaaaaaa', 'x-real-ip': '203.0.113.9' }), 'api');
    expect(keysUsed()).toEqual(['api:user:aaaaaaaa']);
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
