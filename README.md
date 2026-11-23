# Date Benchmark

A headless Chrome benchmark for JavaScript date-time libraries, modeled on [krausest/js-framework-benchmark](https://github.com/krausest/js-framework-benchmark).

Every library runs as a production bundle against shared non-repeating fixtures and a raw `Temporal` + `Intl` platform floor. View the latest interactive report at [bench.nativedates.dev](https://bench.nativedates.dev) to toggle baselines or compare subsets of libraries.

## Benchmarks

The headline score is a 50/50 weighted geometric mean across eight core operations and four application workloads, normalized to the fastest result in each row.

**Core operations (50%)** cover ISO parsing, UTC token formatting, and warm or cold `Intl` localization. They also time calendar and cross-zone DST math, chronological sorting, diffs, and localized relative time.

**Application workloads (50%)** time a 500-row orders table, twelve 42-cell calendar grids, and DST-spanning booking slots against 80 busy intervals. They also measure cold `import()` through first paint in a fresh browser page.

Two supporting metrics appear alongside runtime on every report:

- **Shipped bytes:** `esbuild` production bundles compressed with Brotli-11 and Gzip for both a minimal 3-operation import and the full 12-workload bundle (including required timezone and locale plugins). The `temporal-polyfill` size is reported separately for browsers without native `Temporal`.
- **Correctness and DST audit:** Headless Chrome runs with its host zone pinned to `Europe/Berlin` while zoned workloads target `America/New_York`. Libraries that silently roll over invalid dates like `2026-02-31`, drift across spring-forward DST, or leak host `Date` local time are annotated directly on the results table rather than hidden.

## Methodology

- **Interleaved browser runs:** Contestants run in rotated order across 15 rounds with warm-up passes (skipped for cold `Intl` formatting) and forced GC between runs. Reports publish medians alongside 95% confidence intervals.
- **Non-repeating fixtures:** Inputs span thousands of distinct timestamps across 50 years so single-entry caches cannot skew results. Cold formatting cycles across 20 uncached locale-zone pairs.
- **Platform floor:** Raw `Temporal` + cached `Intl` runs as a contestant alongside every library, separating browser engine cost from library overhead. The HTML report lets you switch normalization between row fastest, the `Temporal` floor, and the fastest library.
- **Fair-play enforcement:** `npm test` checks output parity, fixture immutability, and abstraction boundaries so contestants stay inside their public APIs instead of escaping to raw `Temporal` or custom `Intl` caches.

## Contestants

Each library lives in an isolated workspace under [`contestants/`](contestants/) and is discovered automatically:

- `Temporal` + `Intl` (platform floor)
- `date-fns` + `@date-fns/tz`
- `dayjs` + plugins
- `luxon`
- `moment` + `moment-timezone`
- `native-dates`
- `@formkit/tempo`

## Running locally

Requires Node.js and Playwright's Chromium binary (`npx playwright install chromium` on first setup).

```sh
npm install
npm test
npm run bench
```

The test command verifies contracts, checksums, and the DST audit in Chrome. The benchmark runs 15 interleaved rounds and writes `results/index.html`.

Pass `--contestants` to run a subset, or `--override <pkg>=<dir>` to benchmark an unreleased local checkout.

## Contributing

Library authors and contributors can add a contestant or improve an existing one in a pull request touching only `contestants/<id>/`. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the workspace contract and fair-play rules.
