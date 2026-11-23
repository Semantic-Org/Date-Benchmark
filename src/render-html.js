import { BENCHMARKS } from './spec.js';

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Render a self-contained interactive HTML benchmark report modeled on krausest/js-framework-benchmark
export function renderBenchmarkHtml(data, contestantsMeta) {
  const payload = JSON.stringify({
    benchmarks: BENCHMARKS,
    contestants: contestantsMeta,
    run: data,
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JS Date Benchmark — Results (${esc(data.sha || 'latest')})</title>
<style>
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --border: #dce3ec;
    --border-strong: #b8c4d4;
    --text: #0f172a;
    --muted: #475569;
    --subtle: #64748b;
    --header-bg: #f1f5f9;
    --summary-bg: #eef2ff;
    --accent: #2563eb;
    --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 28px 32px 48px;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font-sans);
    font-size: 13px;
    line-height: 1.45;
  }
  .wrap { max-width: 1360px; margin: 0 auto; }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
  }
  h1 {
    margin: 0 0 4px;
    font-size: 21px;
    font-weight: 700;
    letter-spacing: -0.02em;
  }
  .subtitle {
    margin: 0;
    color: var(--muted);
    font-size: 13px;
  }
  .meta-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    font-family: var(--font-mono);
    font-size: 11.5px;
    color: var(--muted);
  }
  .pill {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 4px 9px;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 10px 14px;
    margin-bottom: 18px;
  }
  .control-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .control-label {
    font-weight: 600;
    font-size: 12px;
    color: var(--muted);
    margin-right: 4px;
  }
  .seg-btn {
    appearance: none;
    border: 1px solid var(--border);
    background: var(--header-bg);
    color: var(--muted);
    font-family: inherit;
    font-size: 12px;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: 5px;
    cursor: pointer;
  }
  .seg-btn.active {
    background: var(--text);
    border-color: var(--text);
    color: #fff;
  }
  .lib-toggle {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 5px;
    background: #fff;
    cursor: pointer;
    user-select: none;
  }
  .lib-toggle input { margin: 0; }
  .legend {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11.5px;
    color: var(--muted);
  }
  .legend-bar {
    width: 132px;
    height: 11px;
    border-radius: 3px;
    background: linear-gradient(90deg, rgb(99, 191, 124) 0%, rgb(255, 235, 132) 50%, rgb(248, 105, 107) 100%);
    border: 1px solid rgba(15, 23, 42, 0.16);
  }
  .table-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow-x: auto;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-variant-numeric: tabular-nums;
  }
  th, td {
    border-bottom: 1px solid var(--border);
    border-right: 1px solid var(--border);
    padding: 7px 10px;
  }
  th:last-child, td:last-child { border-right: none; }
  thead th {
    background: var(--header-bg);
    position: sticky;
    top: 0;
    z-index: 2;
    text-align: center;
    vertical-align: bottom;
    padding: 10px 10px 8px;
    border-bottom: 2px solid var(--border-strong);
  }
  thead th.bench-col {
    text-align: left;
    min-width: 270px;
  }
  .lib-name {
    font-weight: 700;
    font-size: 13px;
    color: var(--text);
    display: block;
  }
  .lib-name a {
    color: inherit;
    text-decoration: none;
  }
  .lib-name a:hover { text-decoration: underline; }
  .lib-ver {
    font-family: var(--font-mono);
    font-size: 10.5px;
    font-weight: 400;
    color: var(--subtle);
    display: block;
    margin-top: 2px;
  }
  .lib-badge {
    display: inline-block;
    margin-top: 4px;
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
  }
  .badge-floor { background: #e2e8f0; color: #334155; }
  .fn-links {
    display: block;
    margin-top: 3px;
    font-family: var(--font-mono);
    font-size: 10.5px;
    line-height: 1.2;
  }
  .fn-ref {
    color: #334155;
    text-decoration: none;
    font-weight: 600;
    margin: 0 1px;
  }
  .fn-ref:hover { text-decoration: underline; color: var(--accent); }
  .cell-fn {
    font-size: 10px;
    font-weight: 700;
    color: rgba(15, 23, 42, 0.78);
    text-decoration: none;
    margin-left: 2px;
  }
  .cell-fn:hover { text-decoration: underline; }
  .notes-card {
    margin-top: 16px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 12px;
    color: var(--muted);
  }
  .notes-title {
    margin: 0 0 8px;
    font-size: 11.5px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #334155;
  }
  .notes-list {
    margin: 0;
    padding-left: 0;
    list-style: none;
    display: grid;
    gap: 5px;
  }
  .notes-list li {
    line-height: 1.45;
  }
  .notes-list li:target {
    background: #fef9c3;
    border-radius: 4px;
    padding: 2px 6px;
    margin: -2px -6px;
  }
  .note-num {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--text);
    margin-right: 6px;
  }
  tr.section-row td {
    background: #f1f5f9;
    font-weight: 700;
    font-size: 11.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #334155;
    padding: 6px 10px;
    border-top: 1px solid var(--border-strong);
  }
  td.bench-name {
    font-weight: 500;
    color: var(--text);
    background: #fff;
  }
  .bench-desc {
    display: block;
    font-weight: 400;
    font-size: 11px;
    color: var(--subtle);
    margin-top: 1px;
  }
  td.metric-cell {
    text-align: center;
    font-family: var(--font-mono);
    min-width: 112px;
    transition: background-color 0.12s ease;
  }
  .cell-main {
    font-weight: 600;
    font-size: 12.5px;
    color: #0f172a;
    display: block;
  }
  .cell-sub {
    font-size: 10.5px;
    color: rgba(15, 23, 42, 0.72);
    display: block;
    margin-top: 1px;
  }
  tr.geomean-row td {
    font-weight: 700;
    border-top: 1.5px solid var(--border-strong);
    border-bottom: 1.5px solid var(--border-strong);
  }
  tr.geomean-row td.bench-name {
    background: #f8fafc;
  }
  tr.headline-row td {
    font-weight: 700;
    border-top: 2px solid #0f172a;
    border-bottom: 2px solid #0f172a;
    padding-top: 9px;
    padding-bottom: 9px;
  }
  tr.headline-row td.bench-name {
    background: #0f172a;
    color: #ffffff;
  }
  tr.headline-row td.bench-name .bench-desc {
    color: #cbd5e1;
  }
  tr.headline-row .cell-main {
    font-size: 14px;
    font-weight: 800;
  }
  .audit-pass { color: #166534; font-weight: 700; }
  .audit-fail { color: #b45309; font-weight: 700; }
  footer {
    margin-top: 14px;
    color: var(--subtle);
    font-size: 11.5px;
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div>
      <h1>JavaScript Date Benchmark</h1>
      <p class="subtitle">Headless Chrome runtime and shipped Brotli-11 bundle size across date-time libraries</p>
    </div>
    <div class="meta-pills" id="meta-pills"></div>
  </header>

  <div class="controls">
    <div class="control-group">
      <span class="control-label">Baseline (1.00x):</span>
      <button class="seg-btn active" data-mode="all">Row Fastest (Krausest)</button>
      <button class="seg-btn" data-mode="floor">Temporal + Intl Floor</button>
      <button class="seg-btn" data-mode="peer">Fastest Library</button>
    </div>
    <div class="control-group" id="lib-toggles"></div>
    <div class="legend">
      <span>1.00x</span>
      <div class="legend-bar"></div>
      <span>4.00x+</span>
    </div>
  </div>

  <div class="table-card">
    <table id="results-table"></table>
  </div>

  <section class="notes-card" id="notes-section" hidden>
    <h2 class="notes-title">Implementation Notes</h2>
    <ol class="notes-list" id="notes-list"></ol>
  </section>

  <footer id="footer-notes"></footer>
</div>

<script id="bench-data" type="application/json">${payload}</script>
<script>
const DATA = JSON.parse(document.getElementById('bench-data').textContent);
const { benchmarks, contestants, run } = DATA;

let mode = 'all'; // 'all' | 'floor' | 'peer'
const enabled = new Set(contestants.map((c) => c.id));

// Exact krausest/js-framework-benchmark 3-stop piecewise RGB heatmap (#63bf7c -> #ffeb84 -> #f8696b)
// paired with a subtle vertical gradient sheen for crisp row separation
function lerpRgb(c1, c2, t) {
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
  return \`linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(0,0,0,0.03) 100%), rgb(\${r}, \${g}, \${b})\`;
}

const KRAUSEST_GREEN = [99, 191, 124];
const KRAUSEST_YELLOW = [255, 235, 132];
const KRAUSEST_RED = [248, 105, 107];

function heatColor(factor) {
  if (!Number.isFinite(factor) || factor <= 1.0) {
    return lerpRgb(KRAUSEST_GREEN, KRAUSEST_YELLOW, 0);
  }
  if (factor < 2.0) {
    return lerpRgb(KRAUSEST_GREEN, KRAUSEST_YELLOW, factor - 1.0);
  }
  return lerpRgb(KRAUSEST_YELLOW, KRAUSEST_RED, Math.min(1.0, (factor - 2.0) / 2.0));
}

function geomean(vals) {
  return Math.exp(vals.reduce((acc, v) => acc + Math.log(v), 0) / vals.length);
}

function activeContestants() {
  return contestants.filter((c) => enabled.has(c.id));
}

function rowBaseline(benchId, cols) {
  const meds = run.medians[benchId];
  if (mode === 'floor') return meds['vanilla-temporal'];
  const pool = mode === 'peer' ? cols.filter((c) => !c.isFloor) : cols;
  const list = (pool.length ? pool : cols).map((c) => meds[c.id]).filter((v) => v > 0);
  return Math.min(...list);
}

function computeScores(cols) {
  const coreBenches = benchmarks.filter((b) => b.tier === 'core' && run.medians[b.id]);
  const appBenches = benchmarks.filter((b) => b.tier === 'workload' && run.medians[b.id]);
  const out = {};
  for (const c of cols) {
    const coreFactors = coreBenches.map((b) => run.medians[b.id][c.id] / rowBaseline(b.id, cols));
    const appFactors = appBenches.map((b) => run.medians[b.id][c.id] / rowBaseline(b.id, cols));
    const coreGm = coreFactors.length ? geomean(coreFactors) : 1;
    const appGm = appFactors.length ? geomean(appFactors) : 1;
    const weighted = coreFactors.length && appFactors.length
      ? Math.sqrt(coreGm * appGm)
      : geomean([...coreFactors, ...appFactors]);
    out[c.id] = { coreGm, appGm, weighted };
  }
  return out;
}

// Build Krausest-style numbered appendix footnotes for any contestant with implementation caveats
function buildFootnotes(cols) {
  const notes = [];
  const headerRefs = new Map(); // contestantId -> [noteNum]
  const cellRefs = new Map();   // benchId|contestantId -> [noteNum]

  const addRef = (map, key, num) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(num);
  };

  if (!run.audits) return { notes, headerRefs, cellRefs };

  // Group 1: non-validating ISO date parser (rolls 2026-02-31 into March)
  const rolloverCols = cols.filter((c) => !c.isFloor && run.audits[c.id] && !run.audits[c.id].rejectsInvalidCalendar);
  if (rolloverCols.length) {
    const num = notes.length + 1;
    notes.push({
      num,
      libs: rolloverCols.map((c) => c.label),
      bench: 'Parse ISO',
      text: 'Delegates ISO calendar strings to native Date parsing without calendar-bounds validation (e.g. "2026-02-31" rolls forward to March 3).',
    });
    for (const c of rolloverCols) {
      addRef(headerRefs, c.id, num);
      addRef(cellRefs, \`01_parse_iso|\${c.id}\`, num);
    }
  }

  // Per-library DST / leap-year caveats
  for (const c of cols) {
    if (c.isFloor) continue;
    const au = run.audits[c.id];
    if (!au) continue;
    if (au.dstAccuracyPct < 100) {
      const num = notes.length + 1;
      const detail = au.dstAccuracyPct === 0
        ? 'Zoned helper returns a host-local Date instance, so calendar day addition steps in the browser host time zone (Europe/Berlin) rather than the target zone (America/New_York; 0% parity across spring-forward DST).'
        : \`Wall-clock day addition shifts by 1 hour on \${(100 - au.dstAccuracyPct).toFixed(1)}% of timestamps crossing the America/New_York spring-forward transition (\${au.dstAccuracyPct.toFixed(1)}% parity).\`;
      notes.push({
        num,
        libs: [c.label],
        bench: 'Zoned DST add + zone convert',
        text: detail,
      });
      addRef(headerRefs, c.id, num);
      addRef(cellRefs, \`06_zoned_dst_math|\${c.id}\`, num);
    }
    if (au.leapYearClamp === false) {
      const num = notes.length + 1;
      notes.push({
        num,
        libs: [c.label],
        bench: 'Calendar add + month/week bounds',
        text: 'Adding 1 year to 2024-02-29 does not clamp to 2025-02-28.',
      });
      addRef(headerRefs, c.id, num);
      addRef(cellRefs, \`05_calendar_math|\${c.id}\`, num);
    }
  }

  // Group: libraries without a built-in Intl formatter wrapper in 03/04
  const rawLocaleCols = cols.filter((c) => c.id === 'dayjs' || c.id === 'moment');
  if (rawLocaleCols.length && (run.medians['03_format_intl_warm'] || run.medians['04_format_intl_cold'])) {
    const num = notes.length + 1;
    notes.push({
      num,
      libs: rawLocaleCols.map((c) => c.label),
      bench: 'Localized Intl format',
      text: 'Library provides no Intl.DateTimeFormat preset wrapper; calls .toDate().toLocaleString(locale, options) directly per Fair-Play exception.',
    });
    for (const c of rawLocaleCols) {
      addRef(headerRefs, c.id, num);
      addRef(cellRefs, \`03_format_intl_warm|\${c.id}\`, num);
      addRef(cellRefs, \`04_format_intl_cold|\${c.id}\`, num);
    }
  }

  return { notes, headerRefs, cellRefs };
}

function formatRefs(nums, cls) {
  if (!nums || !nums.length) return '';
  return nums.map((n) => \`<a class="\${cls}" href="#note-\${n}">[\${n}]</a>\`).join('');
}

function render() {
  const rawCols = activeContestants();
  const scores = computeScores(rawCols);
  // Keep floor pinned first (like vanillajs in krausest), then sort libraries by 50/50 weighted score ascending
  const cols = [...rawCols].sort((a, b) => {
    if (a.isFloor !== b.isFloor) return a.isFloor ? -1 : 1;
    return scores[a.id].weighted - scores[b.id].weighted;
  });

  const { notes, headerRefs, cellRefs } = buildFootnotes(cols);

  const table = document.getElementById('results-table');
  const colSpan = cols.length + 1;
  let html = '<thead><tr><th class="bench-col">Benchmark / Metric</th>';
  for (const c of cols) {
    const ver = c.isFloor ? 'V8 native' : (run.field?.[c.id] ? 'v' + run.field[c.id] : '');
    const refs = formatRefs(headerRefs.get(c.id), 'fn-ref');
    const subMeta = c.isFloor
      ? '<span class="lib-badge badge-floor">Platform Floor</span>'
      : refs
      ? \`<span class="fn-links">\${refs}</span>\`
      : '';
    const titleHtml = c.url
      ? \`<a href="\${c.url}" target="_blank" rel="noopener">\${c.label}</a>\`
      : c.label;
    html += \`<th><span class="lib-name">\${titleHtml}</span><span class="lib-ver">\${ver}</span>\${subMeta}</th>\`;
  }
  html += '</tr></thead><tbody>';

  const renderTier = (tierKey, sectionTitle, gmLabel, gmSub) => {
    const list = benchmarks.filter((b) => b.tier === tierKey && run.medians[b.id]);
    if (!list.length) return;
    html += \`<tr class="section-row"><td colspan="\${colSpan}">\${sectionTitle}</td></tr>\`;
    for (const b of list) {
      const base = rowBaseline(b.id, cols);
      html += \`<tr><td class="bench-name">\${b.label}<span class="bench-desc">\${b.description}</span></td>\`;
      for (const c of cols) {
        const med = run.medians[b.id][c.id];
        const ci = run.intervals?.[b.id]?.[c.id];
        const half = ci ? ((ci[1] - ci[0]) / 2).toFixed(1) : '0.0';
        const factor = med / base;
        const bg = heatColor(factor);
        const cRefs = formatRefs(cellRefs.get(\`\${b.id}|\${c.id}\`), 'cell-fn');
        html += \`<td class="metric-cell" style="background:\${bg}"><span class="cell-main">\${med.toFixed(1)} ms\${cRefs}</span><span class="cell-sub">±\${half} (\${factor.toFixed(2)})</span></td>\`;
      }
      html += '</tr>';
    }
    const gmKey = tierKey === 'core' ? 'coreGm' : 'appGm';
    const minGm = Math.min(...cols.map((c) => scores[c.id][gmKey]));
    html += \`<tr class="geomean-row"><td class="bench-name">\${gmLabel}<span class="bench-desc">\${gmSub}</span></td>\`;
    for (const c of cols) {
      const val = scores[c.id][gmKey];
      const bg = heatColor(val / Math.min(1, minGm));
      html += \`<td class="metric-cell" style="background:\${bg}"><span class="cell-main">\${val.toFixed(2)}x</span></td>\`;
    }
    html += '</tr>';
  };

  renderTier('core', 'Tier 1 — Core Operations (50% Weight)', 'Core Geometric Mean', 'Geometric mean across all 8 core operations');
  renderTier('workload', 'Tier 2 — Application Workloads (50% Weight)', 'App Workloads Geometric Mean', 'Geometric mean across all 4 end-to-end workloads');

  // Headline 50/50 row
  html += \`<tr class="headline-row"><td class="bench-name">50/50 Weighted Geometric Mean<span class="bench-desc">Equal-weighted geometric mean of Tier 1 Core and Tier 2 App Workloads</span></td>\`;
  for (const c of cols) {
    const val = scores[c.id].weighted;
    html += \`<td class="metric-cell" style="background:\${heatColor(val)}"><span class="cell-main">\${val.toFixed(2)}x</span></td>\`;
  }
  html += '</tr>';

  // Shipped Bundle Size section
  if (run.sizes) {
    html += \`<tr class="section-row"><td colspan="\${colSpan}">Transferred Bundle Size (esbuild production minify + Brotli-11)</td></tr>\`;
    const minFull = Math.min(...cols.filter((c) => !c.isFloor).map((c) => run.sizes[c.id].full.brotli));
    const minSmall = Math.min(...cols.filter((c) => !c.isFloor).map((c) => run.sizes[c.id].minimal.brotli));

    html += '<tr><td class="bench-name">Minimal 3-Op Import (Brotli-11)<span class="bench-desc">Tree-shaken parse + add 2 days + format YYYY-MM-DD</span></td>';
    for (const c of cols) {
      const br = run.sizes[c.id].minimal.brotli;
      const factor = c.isFloor ? 1 : br / minSmall;
      const bg = c.isFloor ? '#f8fafc' : heatColor(factor);
      html += \`<td class="metric-cell" style="background:\${bg}"><span class="cell-main">\${(br / 1024).toFixed(2)} kB</span><span class="cell-sub">\${c.isFloor ? 'built-in' : '(' + factor.toFixed(2) + ')'}</span></td>\`;
    }
    html += '</tr>';

    html += '<tr><td class="bench-name">Full 12-Benchmark App Bundle (Brotli-11)<span class="bench-desc">Includes all plugins/locales required by the 12 workloads</span></td>';
    for (const c of cols) {
      const br = run.sizes[c.id].full.brotli;
      const gz = run.sizes[c.id].full.gzip;
      const factor = c.isFloor ? 1 : br / minFull;
      const bg = c.isFloor ? '#f8fafc' : heatColor(factor);
      html += \`<td class="metric-cell" style="background:\${bg}"><span class="cell-main">\${(br / 1024).toFixed(2)} kB</span><span class="cell-sub">gzip \${(gz / 1024).toFixed(1)} kB</span></td>\`;
    }
    html += '</tr>';
  }

  html += '</tbody>';
  table.innerHTML = html;

  const notesSec = document.getElementById('notes-section');
  const notesList = document.getElementById('notes-list');
  if (notes.length) {
    notesSec.hidden = false;
    notesList.innerHTML = notes
      .map(
        (n) =>
          \`<li id="note-\${n.num}"><span class="note-num">[\${n.num}]</span><strong>\${n.libs.join(', ')}</strong> (<em>\${n.bench}</em>): \${n.text}</li>\`,
      )
      .join('');
  }
  else {
    notesSec.hidden = true;
  }
}

// Header pills & controls setup
document.getElementById('meta-pills').innerHTML = [
  \`Chrome \${run.chrome_version || 'headless'}\`,
  \`\${run.rounds} interleaved rounds\`,
  \`Host TZ: Europe/Berlin\`,
  run.sha ? \`SHA: \${run.sha}\` : null,
].filter(Boolean).map((t) => \`<span class="pill">\${t}</span>\`).join('');

const polyKb = run.polyfill ? (run.polyfill.brotli / 1024).toFixed(2) : '18.61';
document.getElementById('footer-notes').innerHTML = \`
  <span>Generated \${run.timestamp ? run.timestamp.slice(0, 19).replace('T', ' ') + ' UTC' : ''} · Columns auto-sorted left-to-right by 50/50 Weighted Geometric Mean.</span>
  <span>Legacy browser Temporal polyfill reference (0 kB on modern Chrome/Firefox/Edge): +\${polyKb} kB Brotli.</span>
\`;

const togglesEl = document.getElementById('lib-toggles');
for (const c of contestants) {
  const lbl = document.createElement('label');
  lbl.className = 'lib-toggle';
  lbl.innerHTML = \`<input type="checkbox" checked value="\${c.id}"><span>\${c.label}</span>\`;
  lbl.querySelector('input').addEventListener('change', (e) => {
    if (e.target.checked) enabled.add(c.id);
    else if (enabled.size > 2) enabled.delete(c.id);
    else e.target.checked = true;
    render();
  });
  togglesEl.appendChild(lbl);
}

for (const btn of document.querySelectorAll('.seg-btn')) {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.seg-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    mode = btn.dataset.mode;
    render();
  });
}

render();
</script>
</body>
</html>
`;
}
