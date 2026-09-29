/**
 * @jest-environment node
 */
import fs from 'node:fs';
import path from 'node:path';

jest.unmock('path');
jest.unmock('fs/promises');

const { join } = jest.requireActual<typeof path>('path');
const ROOT = join(__dirname, '..', '..', '..');

// Unauthenticated test, debug, and repair endpoints removed in a261180 and d186660
const REMOVED = [
  'src/app/api/admin/fix-database/route.ts',
  'src/app/api/admin/update-order-status/route.ts',
  'src/app/api/cron/test-tracking/route.ts',
  'src/app/api/test-catalog/route.ts',
  'src/app/api/catalog-simple/route.ts',
  'src/app/api/debug-env/route.ts',
  'src/app/api/test-auth/route.ts',
  'src/app/api/cache/clear/route.ts',
  'src/app/api/test-clear-cache/route.ts',
  'src/app/debug-auth/page.tsx',
  'src/app/api/tracking/update-single/route.ts',
  'src/components/TrackingStatusLabel.tsx',
  // Shopify integration moved to the scan2ship-b2b application
  'src/app/api/shopify/auth/route.ts',
  'src/app/api/shopify/config/route.ts',
  'src/app/api/shopify/webhooks/route.ts',
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.(ts|tsx|js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

describe('removed public routes', () => {
  it.each(REMOVED)('%s does not exist', (file) => {
    expect(fs.existsSync(join(ROOT, file))).toBe(false);
  });

  it('nothing in src still calls them', () => {
    const endpoints = REMOVED.filter((file) => file.startsWith('src/app/api/')).map(
      (file) => '/api/' + file.slice('src/app/api/'.length, -'/route.ts'.length)
    );
    const offenders = sourceFiles(join(ROOT, 'src')).flatMap((file) => {
      const text = fs.readFileSync(file, 'utf8');
      return endpoints.filter((endpoint) => text.includes(`'${endpoint}'`) || text.includes(`\`${endpoint}`)).map(
        (endpoint) => `${file.slice(ROOT.length + 1)} -> ${endpoint}`
      );
    });
    expect(offenders).toEqual([]);
  });
});

describe('Shopify integration removal', () => {
  const read = (file: string) => fs.readFileSync(join(ROOT, file), 'utf8');

  it('only the Delhivery webhook still imports the Shopify client', () => {
    const importers = sourceFiles(join(ROOT, 'src'))
      .filter((file) => /shopify-api['"]/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length + 1));
    expect(importers).toEqual(['src/app/api/webhooks/delhivery/route.ts']);
  });

  it('fulfillment no longer syncs orders to Shopify', () => {
    const fulfill = read('src/app/api/orders/[id]/fulfill/route.ts');
    expect(fulfill).not.toMatch(/shopify/i);
  });

  it('CORS no longer allows Shopify webhook headers', () => {
    expect(read('src/lib/security-middleware.ts')).not.toContain('X-Shopify-');
  });

  it('the Delhivery webhook is left as it was', () => {
    expect(fs.existsSync(join(ROOT, 'src/app/api/webhooks/delhivery/route.ts'))).toBe(true);
  });
});
