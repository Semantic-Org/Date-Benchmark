import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BENCHMARKS, CONTESTANTS } from '../src/spec.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HISTORY_FILE = join(root, 'history.json');
const RUNS_DIR = join(root, 'runs');

if (!existsSync(HISTORY_FILE)) {
  console.error('No recorded runs in history.json yet. Run `npm run bench:record` first.');
  process.exit(1);
}

const history = JSON.parse(readFileSync(HISTORY_FILE, 'utf8'));
const [cmd, a, b] = process.argv.slice(2);

function findRun(sha) {
  const r = history.runs.find((x) => x.sha === sha || x.sha.startsWith(sha));
  if (!r) throw new Error(`no recorded run matching ${sha}`);
  return r;
}

if (cmd === 'diff') {
  const ra = findRun(a);
  const rb = findRun(b);
  console.log(`${ra.sha} -> ${rb.sha}  (ratio vs fastest peer & vs Temporal floor; lower is better)\n`);
  console.log(
    `50/50 Weighted vs Fastest: ${ra.scores.weighted_vs_fastest.toFixed(2)}x -> ${rb.scores.weighted_vs_fastest.toFixed(2)}x`,
  );
  console.log(
    `50/50 Weighted vs Floor:   ${ra.scores.weighted_vs_floor.toFixed(2)}x -> ${rb.scores.weighted_vs_floor.toFixed(2)}x\n`,
  );
  for (const bench of BENCHMARKS) {
    const ca = ra.comparison[bench.id];
    const cb = rb.comparison[bench.id];
    if (!ca || !cb) continue;
    const delta = cb.ratio - ca.ratio;
    const tag = delta < -0.02 ? 'better' : delta > 0.02 ? 'worse' : 'same';
    console.log(
      `  ${bench.id.padEnd(24)} peer: ${ca.ratio.toFixed(2)}x -> ${cb.ratio.toFixed(2)}x  |  floor: ${ca.ratio_to_floor.toFixed(2)}x -> ${cb.ratio_to_floor.toFixed(2)}x  (${tag})`,
    );
  }
}
else if (cmd === 'markdown') {
  const latest = history.runs.at(-1);
  const raw = JSON.parse(readFileSync(join(RUNS_DIR, `${latest.sha}.json`), 'utf8'));
  console.log(`## Date Benchmark — \`${latest.sha}\` (HeadlessChrome ${latest.chrome_version})\n`);
  console.log('| Contestant | Full App Brotli | Core (8) | App Workloads (4) | **50/50 Weighted** | vs `Temporal` Floor | Correctness Audit |');
  console.log('|---|---:|---:|---:|---:|---:|---|');
  for (const c of CONTESTANTS) {
    const sc = raw.scores[c.id];
    const sz = raw.sizes[c.id];
    const au = raw.audits[c.id];
    const auditCell = au.passed ? '100% pass' : `⚠️ ${au.issues.join(', ')}`;
    console.log(
      `| ${c.label} | ${(sz.full.brotli / 1024).toFixed(2)} kB | ${sc.core_vs_fastest.toFixed(2)}x | ${sc.app_vs_fastest.toFixed(2)}x | **${sc.weighted_vs_fastest.toFixed(2)}x** | ${sc.weighted_vs_floor.toFixed(2)}x | ${auditCell} |`,
    );
  }
}
else {
  const run = history.runs.at(-1);
  console.log(
    `latest ${run.sha}  ${run.timestamp}  ${run.rounds} rounds (${run.wallclock_seconds}s)  HeadlessChrome ${run.chrome_version}`,
  );
  console.log(`${run.msg}\n`);
  console.log(
    `50/50 Weighted: ${run.scores.weighted_vs_fastest.toFixed(2)}x vs fastest · ${run.scores.weighted_vs_floor.toFixed(2)}x vs Temporal floor\n`,
  );
  console.log('  benchmark                vs_peer  vs_floor  fastest_peer');
  for (const bench of BENCHMARKS) {
    const c = run.comparison[bench.id];
    if (!c) continue;
    console.log(
      `  ${bench.id.padEnd(24)} ${ `${c.ratio.toFixed(2)}x`.padEnd(8)} ${ `${c.ratio_to_floor.toFixed(2)}x`.padEnd(9)} ${c.fastest}`,
    );
  }
}
