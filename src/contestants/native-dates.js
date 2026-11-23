import { compare, date, datetime } from 'native-dates';

export function auditChecks() {
  let rejectsInvalidCalendar = false;
  try {
    date('2026-02-31');
  }
  catch {
    rejectsInvalidCalendar = true;
  }

  const springForwardDst = datetime('2026-03-07T15:30:00Z', 'America/New_York')
    .plus(2, 'days')
    .in('Europe/Berlin')
    .format('YYYY-MM-DD HH:mm');

  const leapYearClamp = date('2024-02-29').plus(1, 'year').toString();
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowDt = datetime(fx.NOW_ISO);
  let out = nowDt.in('Europe/Berlin').format('medium', 'de-DE');
  for (let i = 0; i < 50; i++) {
    const created = datetime(fx.orders[i].createdAt, 'America/New_York');
    out = `${created.format('medium', 'en-US')} · ${created.from(nowDt, 'en-US')}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => datetime(s, 'UTC'));
  const preDates = fx.isoDates.map((s) => date(s));
  const preRelInstants = fx.relInstants.map((s) => datetime(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => datetime(s));
  const nowDt = datetime(fx.NOW_ISO);
  const todayCd = date(fx.TODAY_ISO);

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = date(fx.isoDates[i]);
        sum += d.year + d.month + d.day;
      }
      for (let i = 0; i < 2500; i++) {
        const z = datetime(fx.isoInstants[i], 'UTC');
        sum += z.year + z.hour;
      }
      return sum;
    },

    '02_format_token'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = preInstants[i].format('YYYY-MM-DD HH:mm:ss');
      }
      return last;
    },

    '03_format_intl_warm'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = preInstants[i].in(fx.WARM_ZONES[(i * 2 + 1) % 3]).format('medium', fx.WARM_LOCALES[i % 3]);
      }
      return last;
    },

    '04_format_intl_cold'() {
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, tz] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        last = preInstants[i].in(tz).format('medium', loc);
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const wEnd = preDates[i]
          .plus((i % 10) + 1, 'days')
          .plus((i % 5) + 1, 'months')
          .startOf('month')
          .endOf('week', 'monday');
        sum += wEnd.day + wEnd.month;
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        out[i] = datetime(fx.dstInstants[i], 'America/New_York')
          .plus(2, 'days')
          .in('Europe/Berlin')
          .format('YYYY-MM-DD HH:mm');
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += Math.trunc(preInstants[i].until(preInstants[i + 500], 'hours'));
        sum += preDates[i].until(preDates[(i + 500) % preDates.length], 'days');
      }
      const copy = shuffled.slice().sort(compare);
      return sum + (copy[0].epochMilliseconds % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = preRelInstants[i].from(nowDt, i % 2 === 0 ? 'en-US' : 'de-DE');
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = date(o.dueDate);
        if (due.isBefore(todayCd)) {
          rows.push({ created: datetime(o.createdAt, { zone: 'America/New_York', locale: 'en-US' }), due });
        }
      }
      rows.sort((a, b) => compare(b.created, a.created));
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        last = `${rows[i].created.format('medium')} (${rows[i].created.from(nowDt)})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        let cursor = date(year, month, 1).startOf('week', 'monday');
        for (let c = 0; c < 42; c++) {
          const isToday = cursor.equals(todayCd);
          const inMonth = cursor.month === month;
          const isWeekend = cursor.isWeekend();
          const hasEvent = fx.eventDateSet.has(cursor.toString());
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor = cursor.plus(1, 'day');
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) => datetime(b.start).to(b.end));
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const day = date(fx.bookingWorkdays[d]);
        const slots = day.at('09:00', 'America/New_York').to(day.at('17:00', 'America/New_York')).split(30, 'minutes');
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
