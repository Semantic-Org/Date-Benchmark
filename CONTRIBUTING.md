# Contributing a Library or Optimization

`date-benchmark` follows the [`krausest/js-framework-benchmark`](https://github.com/krausest/js-framework-benchmark) contribution model: **every contestant lives in its own self-contained folder under `contestants/<id>/`**, discovered automatically without editing central harness files.

Library authors and community contributors are encouraged to submit pull requests adding new date-time libraries or improving the idiomatic usage of an existing contestant.

## 1. Adding a New Library (`contestants/<id>/`)

Create a folder `contestants/<id>/` with three files:

1. **`contestants/<id>/package.json`** — declares only your library's runtime dependencies and metadata:
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
2. **`contestants/<id>/minimal.js`** — exports a default function that parses `'2026-03-07'`, adds `2` calendar days, and formats `'2026-03-09'` (used for the Minimal Brotli size column and verified by `npm test`):
   ```js
   import { parse, addDays, format } from 'my-lib';

   export default () => format(addDays(parse('2026-03-07'), 2), 'YYYY-MM-DD');
   ```
3. **`contestants/<id>/index.js`** — exports `auditChecks()`, `firstPaint(fx)`, and `createContestant(fx)` implementing `01_parse_iso` through `11_app_booking_slots` (see `contestants/date-fns/index.js` or `contestants/luxon/index.js` as templates).

Then install and verify:

```sh
npm install
npm test                                    # verifies contract, checksums, and DST audit in Chrome
npm run size -- --contestants my-lib        # checks minimal + full app Brotli-11 sizes
npm run bench:quick -- --contestants my-lib # runs 5 interleaved rounds against the Temporal floor
```

## 2. Fair-Play Rules

To keep comparisons honest across libraries:

1. **Public, documented APIs only.** Write callsites the way your documentation recommends to application developers. Do not reach into private package internals or hand-roll custom string parsers/formatters around your library.
2. **Equal semantic work.**
   - `createContestant(fx)` may pre-parse the shared `preInstants`, `preDates`, `preRelInstants`, and `shuffled` arrays (matching all other contestants), and must **not** precompute benchmark answers outside the timed methods.
   - `04_format_intl_cold` must format across all 20 `fx.COLD_PAIRS` without pre-warming those 20 locale/zone pairs at module scope.
   - Never mutate arrays or objects on `fx` in place (`npm test` checks fixture immutability).
3. **Correctness badges are transparent, not disqualifying.** `npm test` enforces structural work parity (`01_parse_iso` checksum, `10_app_month_grid` hits, `11_app_booking_slots` count) so every contestant performs the full workload, while `src/audit.js` records semantic/DST edge cases (`2026-02-31` rollover, cross-zone spring-forward DST when browser `TZ=Europe/Berlin`, leap-year clamping) directly on the results table.

## 3. Benchmarking Unreleased Local Changes

Any library maintainer can test a local checkout without publishing to npm via `--override <package>=<local-dir>`:

```sh
npm test -- --override luxon=../luxon
npm run bench:quick -- --contestants luxon,native-dates --override luxon=../luxon
```
