jest.mock('@/lib/prisma', () => ({
  prisma: { pickup_locations: { findFirst: jest.fn() } },
}));

import { prisma } from '@/lib/prisma';
import { getDelhiveryApiKey } from '@/lib/pickup-location-config';

describe('getDelhiveryApiKey in the browser', () => {
  it('returns no key and never queries, so keys cannot be fetched client-side', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(typeof window).toBe('object');

    expect(await getDelhiveryApiKey('Main Warehouse', 'client-a')).toBe('');
    expect(prisma.pickup_locations.findFirst).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
