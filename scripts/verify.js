import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

import { evaluateAudit } from '../src/audit.js';
import { discoverContestants, parseOverrides } from '../src/discover.js';
import { BENCHMARKS } from '../src/spec.js';
import { measureAllSizes } from './size.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    contestants: { type: 'string' },
    override: { type: 'string', multiple: true },
  },
});

const contestants = discoverContestants(undefined, values.contestants);
const overrides = parseOverrides(values.override);
const inPageIds = BENCHMARKS.filter((b) => !b.coldContext).map((b) => b.id);
const errors = [];

for (const c of contestants) {
  if (!existsSync(c.entry)) errors.push(`${c.id}: missing index.js`);
  if (!existsSync(c.minimalEntry)) errors.push(`${c.id}: missing minimal.js`);
  if (!c.isFloor && (!c.pkg || !c.url)) {
    errors.push(`${c.id}: package.json dateBenchmark block must specify "label", "package", and "url"`);
  }
}

const { bundles, minimalBundles } = await measureAllSizes({ contestants, overrides });
const fixturesCode = readFileSync(join(root, 'src/fixtures.js'), 'utf8');

const html = `<!doctype html><meta charset="utf-8"><script type="module">
import * as fx from '/fixtures.js';
const ids = ${JSON.stringify(contestants.map((c) => c.id))};
const requiredOps = ${JSON.stringify(inPageIds)};

window.__verifyAll = async () => {
  const snapshotBefore = JSON.stringify({ d0: fx.isoDates[0], i0: fx.isoInstants[0], o0: fx.orders[0] });
  const results = {};

  for (const id of ids) {
    const mod = await import('/bundle/' + id + '.js');
    const minMod = await import('/minimal/' + id + '.js');
    const minimalOut = typeof minMod.default === 'function' ? minMod.default() : null;
    const missing = [];
    if (typeof mod.auditChecks !== 'function') missing.push('auditChecks');
    if (typeof mod.firstPaint !== 'function') missing.push('firstPaint');
    if (typeof mod.createContestant !== 'function') missing.push('createContestant');

    let checks = null;
    let outputs = null;
    let firstPaintOut = null;
    if (!missing.length) {
      checks = mod.auditChecks();
      firstPaintOut = mod.firstPaint(fx);
      const inst = mod.createContestant(fx);
      for (const op of requiredOps) {
        if (typeof inst[op] !== 'function') missing.push(op);
      }
      if (!missing.length) {
        for (const op of requiredOps) {
          const val = inst[op]();
          if (val === undefined || val === null || val === '') {
            missing.push(op + ' (empty return)');
          }
        }
        outputs = {
          parseSum: inst['01_parse_iso'](),
          dstOut: inst['06_zoned_dst_math'](),
          gridHits: inst['10_app_month_grid'](),
          openSlots: inst['11_app_booking_slots'](),
        };
      }
    }
    const snapshotAfter = JSON.stringify({ d0: fx.isoDates[0], i0: fx.isoInstants[0], o0: fx.orders[0] });
    results[id] = {
      minimalOut,
      firstPaintOk: typeof firstPaintOut === 'string' && firstPaintOut.length > 5,
      missing,
      mutatedFixtures: snapshotBefore !== snapshotAfter,
      checks,
      outputs,
    };
  }
  return results;
};
</script>`;

const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  if (pathname === '/fixtures.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(fixturesCode);
    return;
  }
  if (pathname.startsWith('/bundle/') && pathname.endsWith('.js')) {
    const id = pathname.slice('/bundle/'.length, -'.js'.length);
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(bundles.get(id));
    return;
  }
  if (pathname.startsWith('/minimal/') && pathname.endsWith('.js')) {
    const id = pathname.slice('/minimal/'.length, -'.js'.length);
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
    res.end(minimalBundles.get(id));
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await chromium.launch({ headless: true });

try {
  const ctx = await browser.newContext({ timezoneId: 'Europe/Berlin', locale: 'en-US' });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => errors.push(`page error: ${err.message}`));
  await page.goto(`http://127.0.0.1:${port}/index.html`);
  await page.waitForFunction(() => typeof window.__verifyAll === 'function');
  const results = await page.evaluate(() => window.__verifyAll());

  const floorRes = results['vanilla-temporal'];
  const ref = { checks: floorRes.checks, ...floorRes.outputs };

  console.log(`Verified ${contestants.length} contestants across ${BENCHMARKS.length} benchmarks:\n`);
  for (const c of contestants) {
    const r = results[c.id];
    if (r.minimalOut !== '2026-03-09') {
      errors.push(`${c.id}: minimal.js returned ${JSON.stringify(r.minimalOut)}, expected "2026-03-09"`);
    }
    if (!r.firstPaintOk) {
      errors.push(`${c.id}: firstPaint() did not return a non-empty rendered string`);
    }
    if (r.missing.length) {
      errors.push(`${c.id}: missing or invalid exports: ${r.missing.join(', ')}`);
    }
    if (r.mutatedFixtures) {
      errors.push(`${c.id}: mutated shared fixtures in place`);
    }
    if (r.outputs) {
      // structural parity required for every contestant (no skipping work!)
      if (r.outputs.parseSum !== ref.parseSum) {
        errors.push(`${c.id}: 01_parse_iso checksum ${r.outputs.parseSum} != ${ref.parseSum}`);
      }
      if (r.outputs.gridHits !== ref.gridHits) {
        errors.push(`${c.id}: 10_app_month_grid hits ${r.outputs.gridHits} != ${ref.gridHits}`);
      }
      if (r.outputs.openSlots !== ref.openSlots) {
        errors.push(`${c.id}: 11_app_booking_slots count ${r.outputs.openSlots} != ${ref.openSlots}`);
      }
      const audit = evaluateAudit(c.id, r.checks, r.outputs, ref);
      const badge = audit.passed ? 'PASS (100%)' : `WARN (${audit.issues.join('; ')})`;
      console.log(`  ✓ ${c.label.padEnd(28)} | contract: ok | audit: ${badge}`);
    }
  }
}
finally {
  await browser.close();
  server.close();
}

if (errors.length) {
  console.error('\nContestant verification failed:');
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('\nAll contestants passed contract verification.');
