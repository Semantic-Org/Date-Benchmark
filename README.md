# `date-benchmark`

Vendor-neutral browser benchmark, shipped-bytes measurement, and cross-zone DST correctness audit for JavaScript date-time libraries — structured after [`krausest/js-framework-benchmark`](https://github.com/krausest/js-framework-benchmark).

Each contestant lives in an isolated workspace under [`contestants/<id>/`](contestants/) (`package.json`, `index.js`, `minimal.js`) and is auto-discovered with zero central-file edits. Library authors can add a library or refine an existing contestant by opening a pull request touching only `contestants/<id>/` (see [`CONTRIBUTING.md`](CONTRIBUTING.md)).

## Design Principles

1. **Platform Floor Included (`Temporal + Intl`):** Raw `Temporal` + cached `Intl` runs alongside every library as the `1.00x` platform floor (analogous to `vanillajs` in `js-framework-benchmark`), separating browser engine cost from library overhead.
2. **Mandatory Correctness & Cross-Zone DST Audit (`src/audit.js`):** Headless Chrome runs in `TZ=Europe/Berlin` while zoned workloads target `America/New_York`, catching libraries that silently fall back to host `Date` local time or roll over invalid ISO dates like `2026-02-31`.
3. **Non-Repeating Wire Fixtures (`src/fixtures.js`):** Operations run over thousands of distinct timestamps across 50 years so single-slot string caches cannot game results.
4. **Two-Tier 50/50 Weighted Geometric Mean (`src/spec.js`):**
   - **Tier 1 — Core Operations (50%):** `01_parse_iso`, `02_format_token`, `03_format_intl_warm`, `04_format_intl_cold`, `05_calendar_math`, `06_zoned_dst_math`, `07_diff_and_sort`, `08_relative_time`.
   - **Tier 2 — Real Application Workloads (50%):** `09_app_orders_table` (500 API rows), `10_app_month_grid` (12 × 42 cells), `11_app_booking_slots` (DST workweeks vs 80 busy ranges), `12_app_cold_startup` (fresh browser page dynamic `import()` + first paint).
5. **Shipped Production Bytes (`scripts/size.js`):** Measures `esbuild` minified, Gzip-9, and Brotli-11 sizes for both `minimal.js` (3-op tree-shaken floor) and `index.js` (full 12-benchmark app bundle including required timezone/locale plugins), plus the `temporal-polyfill` reference for legacy browsers.

## Commands

```sh
npm test                                               # verify all contestants' contracts, checksums, and DST audits
npm run size                                           # measure minimal + full contestant Brotli-11 & Gzip sizes
npm run bench:quick                                    # 5 interleaved rounds in Headless Chrome
npm run bench                                          # 15 interleaved rounds in Headless Chrome
npm run bench -- --contestants luxon,date-fns          # subset of contestants (always includes Temporal floor)
npm run bench -- --override native-dates=../native-dates # test a local checkout of any package
npm run bench:record                                   # record run into history.json and runs/<sha>.json
npm run report                                         # inspect latest recorded ratios
npm run report -- markdown                             # render Markdown leaderboard from latest recorded run
npm run report -- diff A B                             # compare two recorded SHAs
```
