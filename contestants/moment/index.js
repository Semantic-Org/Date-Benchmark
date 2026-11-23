import moment from 'moment-timezone';
import 'moment/locale/de';

export function auditChecks() {
  const bad = moment('2026-02-31', 'YYYY-MM-DD', true);
  const rejectsInvalidCalendar = !bad.isValid();

  const springForwardDst = moment
    .tz('2026-03-07T15:30:00Z', 'America/New_York')
    .add(2, 'days')
    .tz('Europe/Berlin')
    .format('YYYY-MM-DD HH:mm');

  const leapYearClamp = moment.utc('2024-02-29').add(1, 'year').format('YYYY-MM-DD');
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowMm = moment.utc(fx.NOW_ISO);
  let out = nowMm.clone().tz('Europe/Berlin').locale('de').format('lll');
  for (let i = 0; i < 50; i++) {
    const created = moment.tz(fx.orders[i].createdAt, 'America/New_York').locale('en');
    out = `${created.format('lll')} · ${created.from(nowMm)}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => moment.utc(s));
  const preDates = fx.isoDates.map((s) => moment.utc(s));
  const preRelInstants = fx.relInstants.map((s) => moment.utc(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => moment.utc(s));
  const nowMm = moment.utc(fx.NOW_ISO);
  const todayMm = moment.utc(fx.TODAY_ISO);

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = moment.utc(fx.isoDates[i]);
        sum += d.year() + (d.month() + 1) + d.date();
      }
      for (let i = 0; i < 2500; i++) {
        const z = moment.utc(fx.isoInstants[i]);
        sum += z.year() + z.hour();
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
        last = preInstants[i].toDate().toLocaleString(fx.WARM_LOCALES[i % 3], {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: fx.WARM_ZONES[(i * 2 + 1) % 3],
        });
      }
      return last;
    },

    '04_format_intl_cold'() {
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, tz] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        last = preInstants[i].toDate().toLocaleString(loc, {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: tz,
        });
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const wEnd = preDates[i]
          .clone()
          .add((i % 10) + 1, 'days')
          .add((i % 5) + 1, 'months')
          .startOf('month')
          .endOf('isoWeek');
        sum += wEnd.date() + (wEnd.month() + 1);
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        out[i] = moment
          .tz(fx.dstInstants[i], 'America/New_York')
          .add(2, 'days')
          .tz('Europe/Berlin')
          .format('YYYY-MM-DD HH:mm');
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += preInstants[i + 500].diff(preInstants[i], 'hours');
        sum += preDates[(i + 500) % preDates.length].diff(preDates[i], 'days');
      }
      const copy = shuffled.slice().sort((a, b) => a.valueOf() - b.valueOf());
      return sum + (copy[0].valueOf() % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = preRelInstants[i].clone().locale(i % 2 === 0 ? 'en' : 'de').from(nowMm);
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = moment.utc(o.dueDate);
        if (due.isBefore(todayMm, 'day')) {
          rows.push({ created: moment.tz(o.createdAt, 'America/New_York').locale('en'), due });
        }
      }
      rows.sort((a, b) => b.created.valueOf() - a.created.valueOf());
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        last = `${rows[i].created.format('lll')} (${rows[i].created.from(nowMm)})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        const cursor = moment.utc([year, month - 1, 1]).startOf('isoWeek');
        for (let c = 0; c < 42; c++) {
          const isToday = cursor.isSame(todayMm, 'day');
          const inMonth = cursor.month() + 1 === month;
          const dow = cursor.isoWeekday();
          const isWeekend = dow >= 6;
          const hasEvent = fx.eventDateSet.has(cursor.format('YYYY-MM-DD'));
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor.add(1, 'day');
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) => ({ start: moment.utc(b.start), end: moment.utc(b.end) }));
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const dayStr = fx.bookingWorkdays[d];
        const slot = moment.tz(`${dayStr} 09:00`, 'YYYY-MM-DD HH:mm', 'America/New_York');
        const dayEnd = moment.tz(`${dayStr} 17:00`, 'YYYY-MM-DD HH:mm', 'America/New_York');
        while (slot.isBefore(dayEnd)) {
          const next = slot.clone().add(30, 'minutes');
          let blocked = false;
          for (let b = 0; b < busy.length; b++) {
            if (slot.isBefore(busy[b].end) && busy[b].start.isBefore(next)) {
              blocked = true;
              break;
            }
          }
          if (!blocked) openCount++;
          slot.add(30, 'minutes');
        }
      }
      return openCount;
    },
  };
}
