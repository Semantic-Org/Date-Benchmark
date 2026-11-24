// Raw Temporal + Intl baseline (platform floor)
const dtfCache = new Map();
function getDtf(locale, timeZone) {
  const key = `${locale}|${timeZone}`;
  let fmt = dtfCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone });
    dtfCache.set(key, fmt);
  }
  return fmt;
}

const rtfCache = new Map();
function getRtf(locale) {
  let fmt = rtfCache.get(locale);
  if (!fmt) {
    fmt = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    rtfCache.set(locale, fmt);
  }
  return fmt;
}

const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
const pad4 = (n) => String(n).padStart(4, '0');

export function auditChecks() {
  let rejectsInvalidCalendar = false;
  try {
    Temporal.PlainDate.from('2026-02-31');
  }
  catch {
    rejectsInvalidCalendar = true;
  }

  const ny = Temporal.Instant.from('2026-03-07T15:30:00Z').toZonedDateTimeISO('America/New_York');
  const berlin = ny.add({ days: 2 }).withTimeZone('Europe/Berlin');
  const springForwardDst = `${pad4(berlin.year)}-${pad2(berlin.month)}-${pad2(berlin.day)} ${pad2(berlin.hour)}:${pad2(berlin.minute)}`;

  const clamped = Temporal.PlainDate.from('2024-02-29').add({ years: 1 }).toString();
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp: clamped };
}

export function firstPaint(fx) {
  const headerFmt = getDtf('de-DE', 'Europe/Berlin');
  const nowInst = Temporal.Instant.from(fx.NOW_ISO);
  let out = headerFmt.format(nowInst.epochMilliseconds);
  const rowFmt = getDtf('en-US', 'America/New_York');
  const rtf = getRtf('en-US');
  for (let i = 0; i < 50; i++) {
    const inst = Temporal.Instant.from(fx.orders[i].createdAt);
    const days = Math.trunc((inst.epochMilliseconds - nowInst.epochMilliseconds) / 86_400_000);
    out = `${rowFmt.format(inst.epochMilliseconds)} · ${rtf.format(days, 'day')}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => Temporal.Instant.from(s));
  const preDates = fx.isoDates.map((s) => Temporal.PlainDate.from(s));
  const preRelInstants = fx.relInstants.map((s) => Temporal.Instant.from(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => Temporal.Instant.from(s));
  const nowInstant = Temporal.Instant.from(fx.NOW_ISO);
  const todayDate = Temporal.PlainDate.from(fx.TODAY_ISO);

  function formatRelative(inst, locale) {
    const sec = Math.trunc((inst.epochMilliseconds - nowInstant.epochMilliseconds) / 1000);
    const abs = Math.abs(sec);
    const rtf = getRtf(locale);
    if (abs < 60) return rtf.format(sec, 'second');
    if (abs < 3600) return rtf.format(Math.trunc(sec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.trunc(sec / 3600), 'hour');
    if (abs < 86400 * 30) return rtf.format(Math.trunc(sec / 86400), 'day');
    return rtf.format(Math.trunc(sec / (86400 * 30)), 'month');
  }

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = Temporal.PlainDate.from(fx.isoDates[i]);
        sum += d.year + d.month + d.day;
      }
      for (let i = 0; i < 2500; i++) {
        const z = Temporal.Instant.from(fx.isoInstants[i]).toZonedDateTimeISO('UTC');
        sum += z.year + z.hour;
      }
      return sum;
    },

    '02_format_token'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        const z = preInstants[i].toZonedDateTimeISO('UTC');
        last = `${pad4(z.year)}-${pad2(z.month)}-${pad2(z.day)} ${pad2(z.hour)}:${pad2(z.minute)}:${pad2(z.second)}`;
      }
      return last;
    },

    '03_format_intl_warm'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        const fmt = getDtf(fx.WARM_LOCALES[i % 3], fx.WARM_ZONES[(i * 2 + 1) % 3]);
        last = fmt.format(preInstants[i].epochMilliseconds);
      }
      return last;
    },

    '04_format_intl_cold'() {
      const localCache = new Map();
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, tz] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        const key = `${loc}|${tz}`;
        let fmt = localCache.get(key);
        if (!fmt) {
          fmt = new Intl.DateTimeFormat(loc, { dateStyle: 'medium', timeStyle: 'short', timeZone: tz });
          localCache.set(key, fmt);
        }
        last = fmt.format(preInstants[i].epochMilliseconds);
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const shifted = preDates[i].add({ days: (i % 10) + 1, months: (i % 5) + 1 });
        const mStart = shifted.with({ day: 1 });
        const wEnd = mStart.add({ days: 7 - mStart.dayOfWeek });
        sum += wEnd.day + wEnd.month;
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        const ny = Temporal.Instant.from(fx.dstInstants[i]).toZonedDateTimeISO('America/New_York');
        const berlin = ny.add({ days: 2 }).withTimeZone('Europe/Berlin');
        out[i] = `${pad4(berlin.year)}-${pad2(berlin.month)}-${pad2(berlin.day)} ${pad2(berlin.hour)}:${pad2(berlin.minute)}`;
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += Math.trunc((preInstants[i + 500].epochMilliseconds - preInstants[i].epochMilliseconds) / 3_600_000);
        sum += preDates[i].until(preDates[(i + 500) % preDates.length], { largestUnit: 'days' }).days;
      }
      const copy = shuffled.slice().sort(Temporal.Instant.compare);
      return sum + (copy[0].epochMilliseconds % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = formatRelative(preRelInstants[i], i % 2 === 0 ? 'en-US' : 'de-DE');
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = Temporal.PlainDate.from(o.dueDate);
        if (Temporal.PlainDate.compare(due, todayDate) < 0) {
          rows.push({ created: Temporal.Instant.from(o.createdAt), due });
        }
      }
      rows.sort((a, b) => Temporal.Instant.compare(b.created, a.created));
      let last = '';
      const fmt = getDtf('en-US', 'America/New_York');
      for (let i = 0; i < rows.length; i++) {
        last = `${fmt.format(rows[i].created.epochMilliseconds)} (${formatRelative(rows[i].created, 'en-US')})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        const first = new Temporal.PlainDate(year, month, 1);
        let cursor = first.subtract({ days: first.dayOfWeek - 1 });
        for (let c = 0; c < 42; c++) {
          const isToday = Temporal.PlainDate.compare(cursor, todayDate) === 0;
          const inMonth = cursor.month === month;
          const isWeekend = cursor.dayOfWeek >= 6;
          const hasEvent = fx.eventDateSet.has(cursor.toString());
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor = cursor.add({ days: 1 });
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) => ({
        start: Temporal.Instant.from(b.start).toZonedDateTimeISO('UTC'),
        end: Temporal.Instant.from(b.end).toZonedDateTimeISO('UTC'),
      }));
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const day = Temporal.PlainDate.from(fx.bookingWorkdays[d]);
        let slot = day.toZonedDateTime({ timeZone: 'America/New_York', plainTime: '09:00' });
        const dayEnd = day.toZonedDateTime({ timeZone: 'America/New_York', plainTime: '17:00' });
        while (Temporal.ZonedDateTime.compare(slot, dayEnd) < 0) {
          const next = slot.add({ minutes: 30 });
          let blocked = false;
          for (let b = 0; b < busy.length; b++) {
            if (
              Temporal.ZonedDateTime.compare(slot, busy[b].end) < 0
              && Temporal.ZonedDateTime.compare(busy[b].start, next) < 0
            ) {
              blocked = true;
              break;
            }
          }
          if (!blocked) openCount++;
          slot = next;
        }
      }
      return openCount;
    },
  };
}
