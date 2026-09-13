/**
 * Apply pending Prisma migrations during production deploys only.
 * Preview and local `npm run build` skip this so they cannot mutate production.
 *
 * Force locally or in another host with: RUN_PRISMA_MIGRATE=1
 */
const { spawnSync } = require('child_process');

const shouldMigrate =
  process.env.VERCEL_ENV === 'production' ||
  process.env.RUN_PRISMA_MIGRATE === 'true' ||
  process.env.RUN_PRISMA_MIGRATE === '1';

if (!shouldMigrate) {
  console.log(
    '[prisma] Skipping migrate deploy (VERCEL_ENV=%s). Production Vercel builds run it automatically.',
    process.env.VERCEL_ENV || 'unset'
  );
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('[prisma] DATABASE_URL is required to run migrate deploy.');
  process.exit(1);
}

console.log('[prisma] Running prisma migrate deploy against production...');
const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status === null ? 1 : result.status);
