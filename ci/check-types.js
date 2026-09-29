/**
 * TypeScript ratchet. The codebase has pre-existing type errors, so `tsc` cannot
 * gate CI yet. This fails only on errors missing from typecheck-baseline.txt,
 * keyed by file and error code (not line number, so unrelated edits don't churn it).
 *
 *   node ci/check-types.js            check against the baseline
 *   node ci/check-types.js --update   rewrite the baseline (after fixing errors)
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASELINE = path.join(__dirname, '..', 'typecheck-baseline.txt');

const result = spawnSync('npx', ['tsc', '--noEmit', '--incremental', 'false', '--pretty', 'false'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (result.error) {
  console.error(result.error);
  process.exit(2);
}

const counts = new Map();
for (const line of `${result.stdout}\n${result.stderr}`.split('\n')) {
  const match = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+):/);
  // Generated Next.js route types only exist after a build; ignore them.
  if (!match || match[1].startsWith('.next/')) continue;
  const key = `${match[1]} ${match[2]}`;
  counts.set(key, (counts.get(key) || 0) + 1);
}

const format = (map) =>
  [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => `${key} ${count}`)
    .join('\n') + '\n';

if (process.argv.includes('--update')) {
  fs.writeFileSync(BASELINE, format(counts));
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  console.log(`Baseline updated: ${total} known errors in ${counts.size} file/code pairs.`);
  process.exit(0);
}

const baseline = new Map();
for (const line of fs.readFileSync(BASELINE, 'utf8').split('\n')) {
  const match = line.match(/^(.+) (TS\d+) (\d+)$/);
  if (match) baseline.set(`${match[1]} ${match[2]}`, Number(match[3]));
}

const regressions = [];
let fixed = 0;
for (const [key, count] of counts) {
  const allowed = baseline.get(key) || 0;
  if (count > allowed) regressions.push(`${key}: ${count} (baseline ${allowed})`);
}
for (const [key, allowed] of baseline) {
  fixed += Math.max(0, allowed - (counts.get(key) || 0));
}

if (regressions.length > 0) {
  console.error('New TypeScript errors (fix them, or they will fail CI):');
  for (const line of regressions) console.error(`  ${line}`);
  console.error('\nRun `npx tsc --noEmit` to see details.');
  process.exit(1);
}

console.log(`No new TypeScript errors.${fixed ? ` ${fixed} baseline errors are now fixed; run with --update to lock that in.` : ''}`);
