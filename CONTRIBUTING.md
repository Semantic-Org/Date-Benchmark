# Contributing

Every contestant lives in its own folder under `contestants/<id>/` and is discovered automatically. Pull requests that add a library or optimize an existing entry only need to touch files inside that folder.

## Adding a contestant

Create `contestants/<id>/` with three files:

### `package.json`

Declare only your library's runtime dependencies and a `dateBenchmark` metadata block:

```json
{
  "name": "@date-benchmark/my-lib",
  "private": true,
  "type": "module",
  "dependencies": {
    "my-lib": "^1.2.0"
  },
  "dateBenchmark": {
    "label": "my-lib",
    "url": "https://github.com/example/my-lib",
    "package": "my-lib"
  }
}
```

### `minimal.js`

Export a default function that parses `'2026-03-07'`, adds 2 calendar days, and formats `'2026-03-09'`. The suite bundles this file for the minimal Brotli size row and verifies its output.

```js
import { parse, addDays, format } from 'my-lib';

export default () => format(addDays(parse('2026-03-07'), 2), 'YYYY-MM-DD');
```

### `index.js`

Export `auditChecks()`, `firstPaint(fx)`, and `createContestant(fx)` implementing every benchmark in [the benchmark spec](src/spec.js). Use the [date-fns](contestants/date-fns/index.js) or [luxon](contestants/luxon/index.js) contestant as a starting template.

Install dependencies and check your contestant locally:

```sh
npm install
npm test
npm run size -- --contestants my-lib
npm run bench:quick -- --contestants my-lib
```

## Fair-play rules

Just as `js-framework-benchmark` forbids dropping down to raw DOM calls, contestants must stay inside their library's public API. `npm test` enforces these boundaries automatically.

- **No platform escape hatches:** Do not unwrap values into raw `Temporal`, native `Date`, or epoch milliseconds to perform comparisons, arithmetic, or custom `Intl` caching inside timed workloads.
- **Sorting exception:** Libraries with a comparator helper use it. Libraries without one may compare epoch milliseconds inside `.sort(...)` callbacks only.
- **Missing `Intl` wrapper exception:** Libraries with no localized `Intl` formatting API may call `.toDate().toLocaleString(locale, options)` directly, without adding a custom `Intl.DateTimeFormat` cache.
- **Idiomatic domain APIs:** Use your library's range or interval helpers for booking-slot overlap checks when available, and point comparison methods otherwise rather than raw numbers.
- **Equal work and immutable fixtures:** `createContestant(fx)` may pre-parse only the shared input arrays, and must never precompute benchmark results or mutate fixtures in place. The cold formatting benchmark must format all 20 locale-zone pairs without pre-warming them at module scope.
- **Transparent audit notes:** `npm test` requires matching structural checksums across parsing, calendar grids, and booking slots so every library performs the same work. Semantic and DST differences, such as rolling over `2026-02-31` or drifting across spring-forward DST, appear as numbered implementation notes on the report rather than failing the suite.

## Testing a local checkout

Maintainers can benchmark unreleased changes without publishing to npm by passing `--override <package>=<dir>`:

```sh
npm test -- --override luxon=../luxon
npm run bench:quick -- --contestants luxon,native-dates --override luxon=../luxon
```
