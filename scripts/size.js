import { build } from 'esbuild';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';

import { CONTESTANTS } from '../src/spec.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const MINIMAL_SNIPPETS = {
  'vanilla-temporal': `
    const d = Temporal.PlainDate.from('2026-03-07').add({ days: 2 });
    console.log(d.toString());
  `,
  'native-dates': `
    import { date } from 'native-dates';
    console.log(date('2026-03-07').plus(2, 'days').format('YYYY-MM-DD'));
  `,
  'date-fns': `
    import { addDays, format, parseISO } from 'date-fns';
    console.log(format(addDays(parseISO('2026-03-07'), 2), 'yyyy-MM-dd'));
  `,
  dayjs: `
    import dayjs from 'dayjs';
    console.log(dayjs('2026-03-07').add(2, 'day').format('YYYY-MM-DD'));
  `,
  luxon: `
    import { DateTime } from 'luxon';
    console.log(DateTime.fromISO('2026-03-07').plus({ days: 2 }).toFormat('yyyy-MM-dd'));
  `,
  moment: `
    import moment from 'moment';
    console.log(moment.utc('2026-03-07').add(2, 'days').format('YYYY-MM-DD'));
  `,
  tempo: `
    import { addDay, date, format } from '@formkit/tempo';
    console.log(format(addDay(date('2026-03-07'), 2), 'YYYY-MM-DD', 'en-US'));
  `,
};

export function resolveNativeDatesPlugin(nativeDatesDir) {
  const srcIndex = resolve(nativeDatesDir, 'src/index.js');
  return {
    name: 'resolve-native-dates',
    setup({ onResolve }) {
      onResolve({ filter: /^native-dates$/ }, () => ({ path: srcIndex }));
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

export async function bundleEntry({ entryPoint, stdin, nativeDatesDir = resolve(root, '../native-dates') }) {
  const result = await build({
    ...(entryPoint ? { entryPoints: [entryPoint] } : { stdin: { contents: stdin, resolveDir: root, loader: 'js' } }),
    bundle: true,
    minify: true,
    format: 'esm',
    write: false,
    absWorkingDir: root,
    logLevel: 'error',
    plugins: [resolveNativeDatesPlugin(nativeDatesDir)],
    define: { 'process.env.NODE_ENV': '"production"', __DEV__: 'false' },
  });
  const contents = result.outputFiles[0].contents;
  return {
    code: Buffer.from(contents).toString('utf8'),
    ...compressSizes(contents),
  };
}

export async function measureAllSizes({ nativeDatesDir = resolve(root, '../native-dates') } = {}) {
  const sizes = {};
  const bundles = new Map();

  for (const c of CONTESTANTS) {
    const full = await bundleEntry({
      entryPoint: resolve(root, `src/contestants/${c.id}.js`),
      nativeDatesDir,
    });
    const minimal = await bundleEntry({
      stdin: MINIMAL_SNIPPETS[c.id],
      nativeDatesDir,
    });
    bundles.set(c.id, full.code);
    sizes[c.id] = {
      minimal: { minified: minimal.minified, gzip: minimal.gzip, brotli: minimal.brotli },
      full: { minified: full.minified, gzip: full.gzip, brotli: full.brotli },
    };
  }

  const polyfill = await bundleEntry({
    stdin: `import 'temporal-polyfill/global'; console.log(Temporal.Now.instant());`,
    nativeDatesDir,
  });

  return { sizes, bundles, polyfill: { minified: polyfill.minified, gzip: polyfill.gzip, brotli: polyfill.brotli } };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { sizes, polyfill } = await measureAllSizes();
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
  for (const c of CONTESTANTS) {
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
