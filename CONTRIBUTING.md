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

Just as `js-framework-benchmark` forbids bypassing a framework with manual `document.createElement` calls, `date-benchmark` requires every contestant to **stay inside its library's abstraction boundary**:

1. **No raw platform escape hatches inside timed workloads.**
   - Do **not** unwrap instances via `.valueOf()`, `.getTime()`, `.toMillis()`, `.epochMilliseconds`, `.toDate()`, or `.toTemporal()` to perform comparisons (`<`, `>`), arithmetic (`+ 86400000`), or manual `Intl.DateTimeFormat` / `Intl.RelativeTimeFormat` caching outside the library.
   - **Documented exceptions (enforced by `npm test`):**
     - **Sorting (`Array.prototype.sort`):** Libraries with a comparator helper (`native-dates` `compare`, `date-fns` `compareAsc`/`compareDesc`) use it; libraries without a comparator (`dayjs`, `luxon`, `moment`, `tempo`) may use `(a, b) => a.valueOf() - b.valueOf()` / `a.toMillis() - b.toMillis()` inside `.sort(...)` only.
     - **Missing `Intl` wrapper (`03_format_intl_warm`, `04_format_intl_cold`):** Libraries with no `Intl` formatting API (`dayjs`, `moment`) may call `.toDate().toLocaleString(locale, options)` directly (without adding a hand-rolled userland `Map` cache around `Intl.DateTimeFormat`).
2. **Use the library's idiomatic domain API.**
   - Libraries that ship an interval/range type (`native-dates` `Range`, `luxon` `Interval`, `date-fns` interval helpers) use it for interval overlap/splitting (`11_app_booking_slots`); libraries without a range type (`dayjs`, `moment`, `tempo`) use their point comparison methods (`isBefore` / `isAfter`), never raw number comparisons.
3. **Equal work & fixture immutability.**
   - `createContestant(fx)` may pre-parse only the shared `preInstants`, `preDates`, `preRelInstants`, and `shuffled` input arrays, and must **not** precompute benchmark results outside timed methods.
   - `04_format_intl_cold` must format across all 20 `fx.COLD_PAIRS` without pre-warming those pairs at module scope.
   - Never mutate arrays or objects on `fx` in place (`npm test` verifies fixture immutability).
4. **Correctness badges are transparent, not disqualifying.** `npm test` enforces structural work parity (`01_parse_iso` checksum, `10_app_month_grid` hits, `11_app_booking_slots` count) so every contestant performs the full workload, while `src/audit.js` records semantic/DST edge cases (`2026-02-31` rollover, cross-zone spring-forward DST when browser `TZ=Europe/Berlin`, leap-year clamping) directly on the results table.

## 3. Benchmarking Unreleased Local Changes

Any library maintainer can test a local checkout without publishing to npm via `--override <package>=<local-dir>`:

```sh
npm test -- --override luxon=../luxon
npm run bench:quick -- --contestants luxon,native-dates --override luxon=../luxon
```
