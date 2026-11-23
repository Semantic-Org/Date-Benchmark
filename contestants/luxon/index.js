import { DateTime, Interval } from 'luxon';

export function auditChecks() {
  const bad = DateTime.fromISO('2026-02-31');
  const rejectsInvalidCalendar = !bad.isValid;

  const springForwardDst = DateTime.fromISO('2026-03-07T15:30:00Z', { zone: 'America/New_York' })
    .plus({ days: 2 })
    .setZone('Europe/Berlin')
    .toFormat('yyyy-MM-dd HH:mm');

  const leapYearClamp = DateTime.fromISO('2024-02-29').plus({ years: 1 }).toISODate();
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowLx = DateTime.fromISO(fx.NOW_ISO, { zone: 'utc' });
  let out = nowLx.setZone('Europe/Berlin').setLocale('de-DE').toLocaleString(DateTime.DATETIME_MED);
  for (let i = 0; i < 50; i++) {
    const created = DateTime.fromISO(fx.orders[i].createdAt, { zone: 'America/New_York', locale: 'en-US' });
    out = `${created.toLocaleString(DateTime.DATETIME_MED)} · ${created.toRelative({ base: nowLx })}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => DateTime.fromISO(s, { zone: 'utc' }));
  const preDates = fx.isoDates.map((s) => DateTime.fromISO(s, { zone: 'utc' }));
  const preRelInstants = fx.relInstants.map((s) => DateTime.fromISO(s, { zone: 'utc' }));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => DateTime.fromISO(s, { zone: 'utc' }));
  const nowLx = DateTime.fromISO(fx.NOW_ISO, { zone: 'utc' });
  const todayLx = DateTime.fromISO(fx.TODAY_ISO, { zone: 'utc' });

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = DateTime.fromISO(fx.isoDates[i]);
        sum += d.year + d.month + d.day;
      }
      for (let i = 0; i < 2500; i++) {
        const z = DateTime.fromISO(fx.isoInstants[i], { zone: 'utc' });
        sum += z.year + z.hour;
      }
      return sum;
    },

    '02_format_token'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = preInstants[i].toFormat('yyyy-MM-dd HH:mm:ss');
      }
      return last;
    },

    '03_format_intl_warm'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = preInstants[i]
          .setZone(fx.WARM_ZONES[(i * 2 + 1) % 3])
          .setLocale(fx.WARM_LOCALES[i % 3])
          .toLocaleString(DateTime.DATETIME_MED);
      }
      return last;
    },

    '04_format_intl_cold'() {
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, tz] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        last = preInstants[i].setZone(tz).setLocale(loc).toLocaleString(DateTime.DATETIME_MED);
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const wEnd = preDates[i]
          .plus({ days: (i % 10) + 1, months: (i % 5) + 1 })
          .startOf('month')
          .endOf('week');
        sum += wEnd.day + wEnd.month;
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        out[i] = DateTime.fromISO(fx.dstInstants[i], { zone: 'America/New_York' })
          .plus({ days: 2 })
          .setZone('Europe/Berlin')
          .toFormat('yyyy-MM-dd HH:mm');
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += Math.trunc(preInstants[i + 500].diff(preInstants[i], 'hours').hours);
        sum += Math.trunc(preDates[(i + 500) % preDates.length].diff(preDates[i], 'days').days);
      }
      const copy = shuffled.slice().sort((a, b) => a.toMillis() - b.toMillis());
      return sum + (copy[0].toMillis() % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = preRelInstants[i].setLocale(i % 2 === 0 ? 'en-US' : 'de-DE').toRelative({ base: nowLx });
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = DateTime.fromISO(o.dueDate, { zone: 'utc' });
        if (due < todayLx) {
          rows.push({ created: DateTime.fromISO(o.createdAt, { zone: 'America/New_York', locale: 'en-US' }), due });
        }
      }
      rows.sort((a, b) => b.created.toMillis() - a.created.toMillis());
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        last = `${rows[i].created.toLocaleString(DateTime.DATETIME_MED)} (${rows[i].created.toRelative({ base: nowLx })})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        let cursor = DateTime.utc(year, month, 1).startOf('week');
        for (let c = 0; c < 42; c++) {
          const isToday = cursor.hasSame(todayLx, 'day');
          const inMonth = cursor.month === month;
          const isWeekend = cursor.isWeekend;
          const hasEvent = fx.eventDateSet.has(cursor.toISODate());
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor = cursor.plus({ days: 1 });
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) =>
        Interval.fromDateTimes(DateTime.fromISO(b.start), DateTime.fromISO(b.end))
      );
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const dayStr = fx.bookingWorkdays[d];
        const start = DateTime.fromISO(`${dayStr}T09:00:00`, { zone: 'America/New_York' });
        const end = DateTime.fromISO(`${dayStr}T17:00:00`, { zone: 'America/New_York' });
        const slots = Interval.fromDateTimes(start, end).splitBy({ minutes: 30 });
        for (let s = 0; s < slots.length; s++) {
          let blocked = false;
          for (let b = 0; b < busy.length; b++) {
            if (slots[s].overlaps(busy[b])) {
              blocked = true;
              break;
            }
          }
          if (!blocked) openCount++;
        }
      }
      return openCount;
    },
  };
}
