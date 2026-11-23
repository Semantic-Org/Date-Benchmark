import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from 'playwright';

import { evaluateAudit } from '../src/audit.js';
import { discoverContestants, parseOverrides } from '../src/discover.js';
import { renderBenchmarkHtml } from '../src/render-html.js';
import { BENCHMARKS } from '../src/spec.js';
import { measureAllSizes } from './size.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HISTORY_FILE = join(root, 'history.json');
const RUNS_DIR = join(root, 'runs');
const RESULTS_DIR = join(root, 'results');
const SCHEMA_VERSION = 1;

const { values: flags } = parseArgs({
  options: {
    rounds: { type: 'string', default: '15' },
    contestants: { type: 'string' },
    override: { type: 'string', multiple: true },
    filter: { type: 'string' },
    'audit-only': { type: 'boolean', default: false },
    record: { type: 'boolean', default: false },
    focus: { type: 'string', default: 'native-dates' },
    sha: { type: 'string' },
    msg: { type: 'string' },
  },
});

const rounds = Number(flags.rounds ?? 15);
const contestants = discoverContestants(undefined, flags.contestants);
const overrides = parseOverrides(flags.override);

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

function ci95(arr) {
  if (arr.length < 2) return [arr[0] ?? 0, arr[0] ?? 0];
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / (arr.length - 1);
  const half = 1.96 * Math.sqrt(variance / arr.length);
  return [Number((mean - half).toFixed(3)), Number((mean + half).toFixed(3))];
}

const geomean = (vals) => Math.exp(vals.reduce((acc, v) => acc + Math.log(v), 0) / vals.length);

function readPackageVersions() {
  const versions = {};
  for (const c of contestants) {
    if (!c.pkg) continue;
    if (overrides.has(c.pkg)) {
      versions[c.id] = `${overrides.get(c.pkg).version} (local)`;
      continue;
    }
    const localPkg = join(c.dir, 'node_modules', c.pkg, 'package.json');
    const hoistedPkg = join(root, 'node_modules', c.pkg, 'package.json');
    const found = existsSync(localPkg) ? localPkg : hoistedPkg;
    versions[c.id] = existsSync(found) ? JSON.parse(readFileSync(found, 'utf8')).version : 'unknown';
  }
  return versions;
}

function gitIn(dir, ...args) {
  try {
    return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
  }
  catch {
    return 'unknown';
  }
}

async function main() {
  const startWall = Date.now();
  const { sizes, bundles, polyfill } = await measureAllSizes({ contestants, overrides });
  const fixturesCode = readFileSync(join(root, 'src/fixtures.js'), 'utf8');

  const activeBenches = flags.filter
    ? BENCHMARKS.filter((b) => b.id.includes(flags.filter) || b.label.toLowerCase().includes(flags.filter.toLowerCase()))
    : BENCHMARKS;
  const inPageBenches = activeBenches.filter((b) => !b.coldContext);
  const runColdStartup = activeBenches.some((b) => b.id === '12_app_cold_startup');

  const runnerHtml = `<!doctype html><meta charset="utf-8"><script type="module">
import * as fx from '/fixtures.js';
const ids = ${JSON.stringify(contestants.map((c) => c.id))};
const ops = ${JSON.stringify(inPageBenches.map((b) => b.id))};

window.__auditAll = async () => {
  const out = {};
  for (const id of ids) {
    const mod = await import('/bundle/' + id + '.js');
    const inst = mod.createContestant(fx);
    out[id] = {
      checks: mod.auditChecks(),
      outputs: {
        parseSum: inst['01_parse_iso'](),
        dstOut: inst['06_zoned_dst_math'](),
        gridHits: inst['10_app_month_grid'](),
        openSlots: inst['11_app_booking_slots'](),
      },
    };
  }
  return { ua: navigator.userAgent, tz: Intl.DateTimeFormat().resolvedOptions().timeZone, out };
};

window.__runInPage = async (totalRounds) => {
  const impls = {};
  for (const id of ids) {
    const mod = await import('/bundle/' + id + '.js');
    impls[id] = mod.createContestant(fx);
  }
  for (let w = 0; w < 2; w++) {
    for (const id of ids) {
      for (const op of ops) {
        if (op !== '04_format_intl_cold') window.__sink = impls[id][op]();
      }
    }
  }
  const samples = {};
  for (const id of ids) {
    samples[id] = {};
    for (const op of ops) samples[id][op] = [];
  }
  for (let r = 0; r < totalRounds; r++) {
    for (const op of ops) {
      for (let k = 0; k < ids.length; k++) {
        const id = ids[(k + r) % ids.length];
        if (typeof window.gc === 'function') window.gc();
        const t0 = performance.now();
        window.__sink = impls[id][op]();
        const t1 = performance.now();
        samples[id][op].push(t1 - t0);
      }
    }
  }
  return samples;
};
</script>`;

  const coldHtml = `<!doctype html><meta charset="utf-8"><script type="module">
import * as fx from '/fixtures.js';
window.__measureCold = async (id, nonce) => {
  if (typeof window.gc === 'function') window.gc();
  const t0 = performance.now();
  const mod = await import('/bundle/' + id + '.js?n=' + nonce);
  window.__sink = mod.firstPaint(fx);
  const t1 = performance.now();
  return t1 - t0;
};
</script>`;

  const server = createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname === '/index.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(runnerHtml);
      return;
    }
    if (pathname === '/cold.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(coldHtml);
      return;
    }
    if (pathname === '/fixtures.js') {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(fixturesCode);
      return;
    }
    if (pathname.startsWith('/bundle/') && pathname.endsWith('.js')) {
      const id = pathname.slice('/bundle/'.length, -'.js'.length);
      const code = bundles.get(id);
      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(code);
        return;
      }
    }
    res.writeHead(404);
    res.end('not found');
  });

  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const browser = await chromium.launch({ headless: true, args: ['--js-flags=--expose-gc'] });

  try {
    const auditCtx = await browser.newContext({ timezoneId: 'Europe/Berlin', locale: 'en-US' });
    const auditPage = await auditCtx.newPage();
    await auditPage.goto(`http://127.0.0.1:${port}/index.html`);
    await auditPage.waitForFunction(() => typeof window.__auditAll === 'function');
    const rawAudit = await auditPage.evaluate(() => window.__auditAll());
    await auditCtx.close();

    const ref = {
      checks: rawAudit.out['vanilla-temporal'].checks,
      ...rawAudit.out['vanilla-temporal'].outputs,
    };
    const audits = {};
    for (const c of contestants) {
      audits[c.id] = evaluateAudit(c.id, rawAudit.out[c.id].checks, rawAudit.out[c.id].outputs, ref);
    }

    const chromeMatch = /HeadlessChrome\/([\d.]+)/.exec(rawAudit.ua);
    const chromeVersion = chromeMatch ? chromeMatch[1] : rawAudit.ua;
    console.log(`Browser: HeadlessChrome ${chromeVersion} · Host TZ: ${rawAudit.tz}`);
    console.log('\n=== CORRECTNESS & DST INVARIANT AUDIT ===');
    for (const c of contestants) {
      const a = audits[c.id];
      const status = a.passed ? 'PASS (100%)' : `WARN (${a.issues.join('; ')})`;
      console.log(`${c.label.padEnd(28)} | ${status}`);
    }

    if (flags['audit-only']) return;

    const runCtx = await browser.newContext({ timezoneId: 'Europe/Berlin', locale: 'en-US' });
    const runPage = await runCtx.newPage();
    await runPage.goto(`http://127.0.0.1:${port}/index.html`);
    await runPage.waitForFunction(() => typeof window.__runInPage === 'function');
    const samples = await runPage.evaluate((n) => window.__runInPage(n), rounds);
    await runCtx.close();

    if (runColdStartup) {
      for (const c of contestants) samples[c.id]['12_app_cold_startup'] = [];
      for (let r = 0; r < rounds; r++) {
        for (let k = 0; k < contestants.length; k++) {
          const c = contestants[(k + r) % contestants.length];
          const ctx = await browser.newContext({ timezoneId: 'Europe/Berlin', locale: 'en-US' });
          const page = await ctx.newPage();
          await page.goto(`http://127.0.0.1:${port}/cold.html`);
          await page.waitForFunction(() => typeof window.__measureCold === 'function');
          const dt = await page.evaluate(([id, n]) => window.__measureCold(id, n), [c.id, `${r}-${k}`]);
          samples[c.id]['12_app_cold_startup'].push(dt);
          await ctx.close();
        }
      }
    }

    const medians = {};
    const intervals = {};
    for (const b of activeBenches) {
      medians[b.id] = {};
      intervals[b.id] = {};
      for (const c of contestants) {
        medians[b.id][c.id] = Number(median(samples[c.id][b.id]).toFixed(2));
        intervals[b.id][c.id] = ci95(samples[c.id][b.id]);
      }
    }

    const libContestants = contestants.filter((c) => !c.isFloor);
    const fastestAll = {};
    const fastestLib = {};
    for (const b of activeBenches) {
      fastestAll[b.id] = Math.min(...contestants.map((c) => medians[b.id][c.id]));
      fastestLib[b.id] = Math.min(...libContestants.map((c) => medians[b.id][c.id]));
    }

    console.log(`\n=== MEDIAN RUNTIME (${rounds} interleaved rounds, ms, lower is better) ===`);
    const hdr = ['Benchmark'.padEnd(40), ...contestants.map((c) => c.id.slice(0, 12).padStart(12))].join(' | ');
    console.log(hdr);
    console.log('-'.repeat(hdr.length));
    for (const b of activeBenches) {
      console.log(
        [
          b.label.padEnd(40),
          ...contestants.map((c) => `${medians[b.id][c.id].toFixed(2)} ms`.padStart(12)),
        ].join(' | '),
      );
    }

    const coreBenches = activeBenches.filter((b) => b.tier === 'core');
    const appBenches = activeBenches.filter((b) => b.tier === 'workload');
    console.log('\n=== HEADLINE GEOMETRIC MEAN SLOWDOWN (1.00x = Row Fastest, Krausest Convention) ===');
    const scores = {};
    for (const c of contestants) {
      const coreKrausest = coreBenches.length
        ? geomean(coreBenches.map((b) => medians[b.id][c.id] / fastestAll[b.id]))
        : 1;
      const appKrausest = appBenches.length
        ? geomean(appBenches.map((b) => medians[b.id][c.id] / fastestAll[b.id]))
        : 1;
      const weightedKrausest = coreBenches.length && appBenches.length
        ? Math.sqrt(coreKrausest * appKrausest)
        : geomean(activeBenches.map((b) => medians[b.id][c.id] / fastestAll[b.id]));

      const coreVsLib = coreBenches.length
        ? geomean(coreBenches.map((b) => medians[b.id][c.id] / fastestLib[b.id]))
        : 1;
      const appVsLib = appBenches.length
        ? geomean(appBenches.map((b) => medians[b.id][c.id] / fastestLib[b.id]))
        : 1;
      const weightedVsLib = coreBenches.length && appBenches.length
        ? Math.sqrt(coreVsLib * appVsLib)
        : geomean(activeBenches.map((b) => medians[b.id][c.id] / fastestLib[b.id]));

      const coreVsFloor = coreBenches.length
        ? geomean(coreBenches.map((b) => medians[b.id][c.id] / medians[b.id]['vanilla-temporal']))
        : 1;
      const appVsFloor = appBenches.length
        ? geomean(appBenches.map((b) => medians[b.id][c.id] / medians[b.id]['vanilla-temporal']))
        : 1;
      const weightedVsFloor = coreBenches.length && appBenches.length
        ? Math.sqrt(coreVsFloor * appVsFloor)
        : geomean(activeBenches.map((b) => medians[b.id][c.id] / medians[b.id]['vanilla-temporal']));

      scores[c.id] = {
        core_krausest: Number(coreKrausest.toFixed(2)),
        app_krausest: Number(appKrausest.toFixed(2)),
        weighted_krausest: Number(weightedKrausest.toFixed(2)),
        core_vs_fastest: Number(coreVsLib.toFixed(2)),
        app_vs_fastest: Number(appVsLib.toFixed(2)),
        weighted_vs_fastest: Number(weightedVsLib.toFixed(2)),
        weighted_vs_floor: Number(weightedVsFloor.toFixed(2)),
      };

      const badge = audits[c.id].passed ? '100% pass' : 'audit warn';
      console.log(
        `${c.label.padEnd(28)} | Core: ${coreKrausest.toFixed(2)}x | App: ${appKrausest.toFixed(2)}x | 50/50 Weighted: ${weightedKrausest.toFixed(2)}x | vs Floor: ${weightedVsFloor.toFixed(2)}x | Brotli: ${(sizes[c.id].full.brotli / 1024).toFixed(2)} kB | ${badge}`,
      );
    }

    const focusId = flags.focus;
    const focusContestant = contestants.find((c) => c.id === focusId);
    const focusGitDir = (focusContestant?.pkg && overrides.get(focusContestant.pkg)?.dir) ?? root;
    const sha = flags.sha ?? gitIn(focusGitDir, 'rev-parse', '--short', 'HEAD');
    const msg = flags.msg ?? gitIn(focusGitDir, 'log', '-1', '--format=%s');
    const wallclockSeconds = Math.round((Date.now() - startWall) / 1000);
    const versions = readPackageVersions();
    const runTimestamp = new Date().toISOString();

    const fullRunData = {
      sha,
      focus: focusId,
      msg,
      timestamp: runTimestamp,
      rounds,
      wallclock_seconds: wallclockSeconds,
      chrome_version: chromeVersion,
      field: versions,
      sizes,
      polyfill,
      audits,
      scores,
      medians,
      intervals,
    };

    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });
    const htmlPath = join(RESULTS_DIR, 'index.html');
    writeFileSync(join(RESULTS_DIR, 'latest.json'), `${JSON.stringify(fullRunData, null, 2)}\n`);
    writeFileSync(
      htmlPath,
      renderBenchmarkHtml(
        fullRunData,
        contestants.map((c) => ({ id: c.id, label: c.label, url: c.url, isFloor: c.isFloor })),
      ),
    );
    console.log(`\nVisual HTML report: file://${htmlPath}`);

    if (flags.record) {
      const peers = libContestants.filter((c) => c.id !== focusId).map((c) => c.id);

      const comparison = {};
      for (const b of activeBenches) {
        const selfVal = medians[b.id][focusId];
        let bestComp = null;
        let bestVal = Infinity;
        for (const comp of peers) {
          if (medians[b.id][comp] < bestVal) {
            bestVal = medians[b.id][comp];
            bestComp = comp;
          }
        }
        comparison[b.id] = {
          ratio: Number((selfVal / bestVal).toFixed(2)),
          ratio_to_floor: Number((selfVal / medians[b.id]['vanilla-temporal']).toFixed(2)),
          fastest: bestComp,
        };
      }

      const entry = {
        sha,
        focus: focusId,
        msg,
        timestamp: runTimestamp,
        rounds,
        wallclock_seconds: wallclockSeconds,
        chrome_version: chromeVersion,
        field: versions,
        scores: scores[focusId],
        comparison,
      };

      const history = existsSync(HISTORY_FILE)
        ? JSON.parse(readFileSync(HISTORY_FILE, 'utf8'))
        : { schema_version: SCHEMA_VERSION, runs: [] };
      const idx = history.runs.findIndex((r) => r.sha === sha && r.focus === focusId);
      if (idx >= 0) history.runs[idx] = entry;
      else history.runs.push(entry);
      writeFileSync(HISTORY_FILE, `${JSON.stringify(history, null, 2)}\n`);

      if (!existsSync(RUNS_DIR)) mkdirSync(RUNS_DIR, { recursive: true });
      writeFileSync(join(RUNS_DIR, `${sha}.json`), `${JSON.stringify(fullRunData, null, 2)}\n`);
      console.log(`Recorded run ${sha} (${focusId}) to history.json and runs/${sha}.json`);
    }
  }
  finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
