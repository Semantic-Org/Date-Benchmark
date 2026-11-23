import {
  addDay,
  addMinute,
  addMonth,
  addYear,
  date as tempoDate,
  diffDays,
  diffHours,
  format,
  isBefore,
  monthStart,
  relative,
  sameDay,
  tzDate,
  weekEnd,
  weekStart,
} from '@formkit/tempo';

export function auditChecks() {
  let rejectsInvalidCalendar = false;
  try {
    const bad = tempoDate('2026-02-31');
    rejectsInvalidCalendar = Number.isNaN(bad.getTime()) || format(bad, 'YYYY-MM-DD', 'en-US') === '2026-02-31'
      ? Number.isNaN(bad.getTime())
      : false;
  }
  catch {
    rejectsInvalidCalendar = true;
  }

  const ny = tzDate('2026-03-07T15:30:00Z', 'America/New_York');
  const springForwardDst = format({
    date: addDay(ny, 2),
    format: 'YYYY-MM-DD HH:mm',
    tz: 'Europe/Berlin',
    locale: 'en-US',
  });

  const leapYearClamp = format(addYear(tempoDate('2024-02-29'), 1), 'YYYY-MM-DD', 'en-US');
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowTp = tempoDate(fx.NOW_ISO);
  let out = format({ date: nowTp, format: { date: 'medium', time: 'short' }, locale: 'de-DE', tz: 'Europe/Berlin' });
  for (let i = 0; i < 50; i++) {
    const created = tempoDate(fx.orders[i].createdAt);
    const label = format({
      date: created,
      format: { date: 'medium', time: 'short' },
      locale: 'en-US',
      tz: 'America/New_York',
    });
    out = `${label} · ${relative(created, { base: nowTp, locale: 'en-US' })}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => tempoDate(s));
  const preDates = fx.isoDates.map((s) => tempoDate(s));
  const preRelInstants = fx.relInstants.map((s) => tempoDate(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => tempoDate(s));
  const nowTp = tempoDate(fx.NOW_ISO);
  const todayTp = tempoDate(fx.TODAY_ISO);

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = tempoDate(fx.isoDates[i]);
        sum += d.getFullYear() + (d.getMonth() + 1) + d.getDate();
      }
      for (let i = 0; i < 2500; i++) {
        const z = tempoDate(fx.isoInstants[i]);
        sum += z.getUTCFullYear() + z.getUTCHours();
      }
      return sum;
    },

    '02_format_token'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = format({ date: preInstants[i], format: 'YYYY-MM-DD HH:mm:ss', tz: 'UTC', locale: 'en-US' });
      }
      return last;
    },

    '03_format_intl_warm'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = format({
          date: preInstants[i],
          format: { date: 'medium', time: 'short' },
          locale: fx.WARM_LOCALES[i % 3],
          tz: fx.WARM_ZONES[(i * 2 + 1) % 3],
        });
      }
      return last;
    },

    '04_format_intl_cold'() {
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, tz] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        last = format({
          date: preInstants[i],
          format: { date: 'medium', time: 'short' },
          locale: loc,
          tz,
        });
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const shifted = addMonth(addDay(preDates[i], (i % 10) + 1), (i % 5) + 1);
        const wEnd = weekEnd(monthStart(shifted), 1);
        sum += wEnd.getDate() + (wEnd.getMonth() + 1);
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        const ny = tzDate(fx.dstInstants[i], 'America/New_York');
        out[i] = format({
          date: addDay(ny, 2),
          format: 'YYYY-MM-DD HH:mm',
          tz: 'Europe/Berlin',
          locale: 'en-US',
        });
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += diffHours(preInstants[i + 500], preInstants[i]);
        sum += diffDays(preDates[(i + 500) % preDates.length], preDates[i]);
      }
      const copy = shuffled.slice().sort((a, b) => a.getTime() - b.getTime());
      return sum + (copy[0].getTime() % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = relative(preRelInstants[i], { base: nowTp, locale: i % 2 === 0 ? 'en-US' : 'de-DE' });
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = tempoDate(o.dueDate);
        if (isBefore(due, todayTp)) {
          rows.push({ created: tempoDate(o.createdAt), due });
        }
      }
      rows.sort((a, b) => b.created.getTime() - a.created.getTime());
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        const text = format({
          date: rows[i].created,
          format: { date: 'medium', time: 'short' },
          locale: 'en-US',
          tz: 'America/New_York',
        });
        last = `${text} (${relative(rows[i].created, { base: nowTp, locale: 'en-US' })})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        let cursor = weekStart(new Date(year, month - 1, 1), 1);
        for (let c = 0; c < 42; c++) {
          const isToday = sameDay(cursor, todayTp);
          const inMonth = cursor.getMonth() + 1 === month;
          const dow = cursor.getDay();
          const isWeekend = dow === 0 || dow === 6;
          const hasEvent = fx.eventDateSet.has(format(cursor, 'YYYY-MM-DD', 'en-US'));
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor = addDay(cursor, 1);
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) => [tempoDate(b.start).getTime(), tempoDate(b.end).getTime()]);
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const dayStr = fx.bookingWorkdays[d];
        let slot = tzDate(`${dayStr}T09:00:00`, 'America/New_York');
        const dayEnd = tzDate(`${dayStr}T17:00:00`, 'America/New_York');
        while (slot.getTime() < dayEnd.getTime()) {
          const next = addMinute(slot, 30);
          const sMs = slot.getTime();
          const eMs = next.getTime();
          let blocked = false;
          for (let b = 0; b < busy.length; b++) {
            if (sMs < busy[b][1] && busy[b][0] < eMs) {
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
