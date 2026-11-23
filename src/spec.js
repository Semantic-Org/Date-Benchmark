export const CONTESTANTS = [
  { id: 'vanilla-temporal', label: 'Temporal + Intl (floor)', isFloor: true, pkg: null },
  { id: 'native-dates', label: 'native-dates', pkg: 'native-dates' },
  { id: 'date-fns', label: 'date-fns + @date-fns/tz', pkg: 'date-fns' },
  { id: 'dayjs', label: 'dayjs + plugins', pkg: 'dayjs' },
  { id: 'luxon', label: 'luxon', pkg: 'luxon' },
  { id: 'moment', label: 'moment + moment-timezone', pkg: 'moment' },
  { id: 'tempo', label: '@formkit/tempo', pkg: '@formkit/tempo' },
];

export const BENCHMARKS = [
  // Tier 1: Core Operations (50% of headline geometric mean)
  {
    id: '01_parse_iso',
    tier: 'core',
    label: 'Parse ISO (2.5k dates + 2.5k instants)',
    description: 'Parses 2,500 distinct YYYY-MM-DD strings and 2,500 distinct .sssZ instants across 50 years',
  },
  {
    id: '02_format_token',
    tier: 'core',
    label: 'Token format UTC (3k)',
    description: 'Formats 3,000 distinct UTC timestamps as YYYY-MM-DD HH:mm:ss',
  },
  {
    id: '03_format_intl_warm',
    tier: 'core',
    label: 'Localized Intl format warm 3x3 (3k)',
    description: 'Formats 3,000 distinct timestamps across 3 locales (en-US, de-DE, ja-JP) and 3 IANA zones',
  },
  {
    id: '04_format_intl_cold',
    tier: 'core',
    label: 'Localized Intl format cold 20 pairs (400)',
    description: 'Formats 400 timestamps cycling across 20 cold locale-zone pairs to measure Intl setup/cache cost',
  },
  {
    id: '05_calendar_math',
    tier: 'core',
    label: 'Calendar add + month/week bounds (3k)',
    description: 'Adds days and months across 3,000 dates, then resolves startOfMonth and Monday endOfWeek',
  },
  {
    id: '06_zoned_dst_math',
    tier: 'core',
    label: 'Zoned DST add + zone convert (1k)',
    description: 'Adds 2 calendar days in America/New_York across March spring-forward DST and converts to Europe/Berlin',
  },
  {
    id: '07_diff_and_sort',
    tier: 'core',
    label: 'Diff hours/days (2k) + sort (1k)',
    description: 'Computes 2,000 signed hour and calendar-day diffs and sorts 1,000 shuffled instants chronologically',
  },
  {
    id: '08_relative_time',
    tier: 'core',
    label: 'Relative time en/de (2k)',
    description: 'Formats 2,000 localized relative-time phrases across seconds through months in en-US and de-DE',
  },

  // Tier 2: Real Application Workloads (50% of headline geometric mean)
  {
    id: '09_app_orders_table',
    tier: 'workload',
    label: 'App: SaaS orders table (500 rows)',
    description: 'Hydrates 500 JSON API orders, filters overdue rows, sorts newest-first, and renders localized timestamp + relative label',
  },
  {
    id: '10_app_month_grid',
    tier: 'workload',
    label: 'App: 12x42 calendar month grids',
    description: 'Builds 12 Monday-first 42-cell monthly grids, checking isToday, isSameMonth, isWeekend, and event membership',
  },
  {
    id: '11_app_booking_slots',
    tier: 'workload',
    label: 'App: Booking free slots across DST',
    description: 'Finds open 30-minute workweek slots (09:00-17:00 America/New_York) across 4 March DST weeks against 80 busy intervals',
  },
  {
    id: '12_app_cold_startup',
    tier: 'workload',
    coldContext: true,
    label: 'App: Cold import + first paint (50 rows)',
    description: 'Dynamically imports the production bundle in a fresh browser page and renders a localized header plus 50 order rows',
  },
];
