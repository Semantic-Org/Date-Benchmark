import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// auto-discover contestants/<id>/package.json so adding a library requires zero central-file edits
export function discoverContestants(contestantsDir = join(root, 'contestants'), filterIds = null) {
  const allow = filterIds
    ? new Set(filterIds.split(',').map((s) => s.trim()).filter(Boolean))
    : null;

  const entries = readdirSync(contestantsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(contestantsDir, d.name, 'package.json')))
    .map((d) => {
      const id = d.name;
      const dir = join(contestantsDir, id);
      const pkgJson = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
      const meta = pkgJson.dateBenchmark ?? {};
      return {
        id,
        dir,
        entry: join(dir, 'index.js'),
        minimalEntry: join(dir, 'minimal.js'),
        label: meta.label ?? id,
        url: meta.url ?? null,
        pkg: meta.package ?? null,
        isFloor: Boolean(meta.isFloor),
      };
    })
    .filter((c) => !allow || c.isFloor || allow.has(c.id));

  return entries.sort((a, b) => {
    if (a.isFloor !== b.isFloor) return a.isFloor ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

// parse generic `--override pkg=/path/to/checkout` flags (usable by any library author testing local changes)
export function parseOverrides(rawOverrides = []) {
  const list = Array.isArray(rawOverrides) ? rawOverrides : [rawOverrides];
  const map = new Map();
  for (const item of list) {
    if (!item) continue;
    const eq = item.indexOf('=');
    if (eq <= 0) throw new Error(`invalid --override "${item}" (expected <package>=<local-dir>)`);
    const pkgName = item.slice(0, eq).trim();
    const targetDir = resolve(item.slice(eq + 1).trim());
    const targetPkg = JSON.parse(readFileSync(join(targetDir, 'package.json'), 'utf8'));
    const rootExport = targetPkg.exports?.['.'];
    const relEntry = (typeof rootExport === 'string'
      ? rootExport
      : rootExport?.import ?? rootExport?.default)
      ?? targetPkg.module
      ?? targetPkg.main
      ?? 'index.js';
    map.set(pkgName, { dir: targetDir, entry: resolve(targetDir, relEntry), version: targetPkg.version });
  }
  return map;
}
