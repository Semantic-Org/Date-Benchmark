import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

import { discoverContestants, parseOverrides } from '../src/discover.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function overridePlugin(overrides) {
  return {
    name: 'package-overrides',
    setup({ onResolve }) {
      for (const [pkgName, info] of overrides.entries()) {
        const escaped = pkgName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        onResolve({ filter: new RegExp(`^${escaped}$`) }, () => ({ path: info.entry }));
      }
    },
  };
}

function compressSizes(contents) {
  const gzip = gzipSync(contents, { level: 9 });
  const brotli = brotliCompressSync(contents, {
    params: { [zlibConstants.BROTLI_PARAM_QUALITY]: 11 },
  });
  return {
    minified: contents.byteLength,
    gzip: gzip.byteLength,
    brotli: brotli.byteLength,
  };
}

export async function bundleEntry({ entryPoint, stdin, resolveDir = root, overrides = new Map() }) {
  const result = await build({
    ...(entryPoint ? { entryPoints: [entryPoint] } : { stdin: { contents: stdin, resolveDir, loader: 'js' } }),
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    absWorkingDir: resolveDir,
    logLevel: 'error',
    plugins: overrides.size ? [overridePlugin(overrides)] : [],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
  });
  const contents = result.outputFiles[0].contents;
  return {
    code: Buffer.from(contents).toString('utf8'),
    ...compressSizes(contents),
  };
}

export async function measureAllSizes({ contestants = discoverContestants(), overrides = new Map() } = {}) {
  const sizes = {};
  const bundles = new Map();
  const minimalBundles = new Map();

  for (const c of contestants) {
    const full = await bundleEntry({ entryPoint: c.entry, resolveDir: c.dir, overrides });
    const minimal = await bundleEntry({ entryPoint: c.minimalEntry, resolveDir: c.dir, overrides });
    bundles.set(c.id, full.code);
    minimalBundles.set(c.id, minimal.code);
    sizes[c.id] = {
      minimal: { minified: minimal.minified, gzip: minimal.gzip, brotli: minimal.brotli },
      full: { minified: full.minified, gzip: full.gzip, brotli: full.brotli },
    };
  }

  const polyfill = await bundleEntry({
    stdin: `import 'temporal-polyfill/global'; console.log(Temporal.Now.instant());`,
    resolveDir: root,
  });

  return {
    sizes,
    bundles,
    minimalBundles,
    polyfill: { minified: polyfill.minified, gzip: polyfill.gzip, brotli: polyfill.brotli },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      contestants: { type: 'string' },
      override: { type: 'string', multiple: true },
    },
  });
  const contestants = discoverContestants(undefined, values.contestants);
  const overrides = parseOverrides(values.override);
  const { sizes, polyfill } = await measureAllSizes({ contestants, overrides });

  console.log('Shipped Production Bundle Sizes (esbuild minify + Brotli-11)\n');
  console.log(
    [
      'Contestant'.padEnd(28),
      'Minimal Brotli'.padStart(15),
      'Full App Brotli'.padStart(16),
      'Full App Gzip'.padStart(14),
      'Full Minified'.padStart(14),
    ].join(' | '),
  );
  console.log('-'.repeat(99));
  for (const c of contestants) {
    const s = sizes[c.id];
    console.log(
      [
        c.label.padEnd(28),
        `${(s.minimal.brotli / 1024).toFixed(2)} kB`.padStart(15),
        `${(s.full.brotli / 1024).toFixed(2)} kB`.padStart(16),
        `${(s.full.gzip / 1024).toFixed(2)} kB`.padStart(14),
        `${(s.full.minified / 1024).toFixed(1)} kB`.padStart(14),
      ].join(' | '),
    );
  }
  console.log(
    `\nLegacy browser Temporal polyfill (temporal-polyfill/global, 0 kB on modern Chrome/Firefox/Edge): ${(polyfill.brotli / 1024).toFixed(2)} kB Brotli (${(polyfill.gzip / 1024).toFixed(2)} kB Gzip)`,
  );
}
