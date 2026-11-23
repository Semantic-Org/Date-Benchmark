# `date-benchmark`

Browser-based cross-library benchmark, shipped-bytes measurement, and DST/calendar correctness audit for JavaScript date-time libraries — modeled after [`krausest/js-framework-benchmark`](https://github.com/krausest/js-framework-benchmark).

## Design Principles

1. **Platform Floor Included (`Temporal + Intl`):** Raw `Temporal` + cached `Intl` runs alongside every library as the `1.00x` platform floor (the equivalent of `vanillajs` in `js-framework-benchmark`), separating engine cost from wrapper overhead.
2. **Mandatory Correctness & Cross-Zone DST Audit (`src/audit.js`):** The browser runs in `TZ=Europe/Berlin` while zoned workloads target `America/New_York`, catching libraries that silently fall back to host `Date` local time or roll over invalid ISO dates like `2026-02-31`.
3. **Non-Repeating Wire Fixtures (`src/fixtures.js`):** Every operation iterates over hundreds or thousands of distinct timestamps across decades so 1-entry string caches cannot distort results.
4. **Two-Tier 50/50 Weighted Geometric Mean (`src/spec.js`):**
   - **Tier 1 — Core Operations (50%):**
     - `01_parse_iso`: 2,500 ISO dates + 2,500 `.sssZ` instants
     - `02_format_token`: 3,000 UTC `YYYY-MM-DD HH:mm:ss` formats
     - `03_format_intl_warm`: 3,000 localized `Intl` medium formats across 3 locales × 3 zones
     - `04_format_intl_cold`: 400 localized `Intl` formats cycling 20 cold locale-zone pairs
     - `05_calendar_math`: 3,000 `addDays` + `addMonths` + `startOfMonth` + Monday `endOfWeek` chains
     - `06_zoned_dst_math`: 1,000 `America/New_York` +2d spring-forward DST -> `Europe/Berlin` conversions
     - `07_diff_and_sort`: 2,000 hour + calendar-day diffs + 1,000-item chronological sort
     - `08_relative_time`: 2,000 `en-US` and `de-DE` relative phrases
   - **Tier 2 — Real Application Workloads (50%):**
     - `09_app_orders_table`: 500 JSON API orders hydrated, filtered for overdue, sorted, and formatted
     - `10_app_month_grid`: 12 Monday-first 42-cell calendar grids with `isToday`, `isWeekend`, and event lookup
     - `11_app_booking_slots`: Open 30-minute workweek slots across 4 March DST weeks against 80 busy intervals
     - `12_app_cold_startup`: Fresh browser context dynamic `import()` + localized header + 50 rendered rows
5. **Shipped Production Bytes (`scripts/size.js`):** Measures `esbuild` minified, Gzip-9, and Brotli-11 sizes for both a minimal 3-op import and the full 12-benchmark app contestant (including required timezone/locale plugins), plus the `temporal-polyfill` reference for legacy browsers.

## Commands

```sh
npm run audit                  # run correctness & cross-zone DST checks in Headless Chrome
npm run size                   # measure minimal + full contestant Brotli-11 & Gzip bundle sizes
npm run bench:quick            # 5 interleaved rounds in Headless Chrome
npm run bench                  # 15 interleaved rounds in Headless Chrome
npm run bench:record           # record run into history.json and runs/<sha>.json
npm run report                 # inspect latest recorded ratios
npm run report -- markdown     # render Markdown leaderboard from latest recorded run
npm run report -- diff A B     # compare two recorded native-dates SHAs
```

Pass `--native-dates-dir /path/to/checkout` to `scripts/run.js` to benchmark a specific `native-dates` branch or worktree.
