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
  'src/lib/shopify-api.ts',
  // Unused and broken: debug client listing, a commented-out label route, password
  // changes that wrote non-existent columns, and uploads to a missing table
  'src/app/api/test-admin/route.ts',
  'src/app/api/orders/[id]/shipping-label/route.ts',
  'src/app/api/admin/clients/[id]/update-password/route.ts',
  'src/app/api/auth/change-password/route.ts',
  'src/app/api/upload/route.ts',
  // System settings that nothing read (the app uses environment variables),
  // including leftover Shopify and never-built WhatsApp settings
  'src/app/api/admin/system-config/route.ts',
  'src/lib/system-config.ts',
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

  it('nothing in src imports the removed Shopify client', () => {
    const importers = sourceFiles(join(ROOT, 'src'))
      .filter((file) => /shopify-api['"]/.test(fs.readFileSync(file, 'utf8')))
      .map((file) => file.slice(ROOT.length + 1));
    expect(importers).toEqual([]);
  });

  it('fulfillment no longer syncs orders to Shopify', () => {
    const fulfill = read('src/app/api/orders/[id]/fulfill/route.ts');
    expect(fulfill).not.toMatch(/shopify/i);
  });

  it('CORS no longer allows Shopify webhook headers', () => {
    expect(read('src/lib/security-middleware.ts')).not.toContain('X-Shopify-');
  });

  it('the Delhivery webhook no longer calls Shopify', () => {
    const webhook = read('src/app/api/webhooks/delhivery/route.ts');
    expect(webhook).not.toMatch(/shopify/i);
    expect(webhook).not.toContain('myshopify.com');
  });
});
