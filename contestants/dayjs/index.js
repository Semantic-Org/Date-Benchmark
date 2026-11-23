import dayjs from 'dayjs';
import 'dayjs/locale/de';
import isoWeek from 'dayjs/plugin/isoWeek';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(isoWeek);

export function auditChecks() {
  const bad = dayjs('2026-02-31');
  const rejectsInvalidCalendar = !bad.isValid() || bad.format('YYYY-MM-DD') === '2026-02-31' ? !bad.isValid() : false;

  const springForwardDst = dayjs('2026-03-07T15:30:00Z')
    .tz('America/New_York')
    .add(2, 'day')
    .tz('Europe/Berlin')
    .format('YYYY-MM-DD HH:mm');

  const leapYearClamp = dayjs('2024-02-29').add(1, 'year').format('YYYY-MM-DD');
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowDj = dayjs(fx.NOW_ISO);
  let out = nowDj.tz('Europe/Berlin').locale('de').format('lll');
  for (let i = 0; i < 50; i++) {
    const created = dayjs(fx.orders[i].createdAt).tz('America/New_York');
    out = `${created.format('lll')} · ${created.from(nowDj)}`;
  }
  return out;
}

export function createContestant(fx) {
  const preInstants = fx.isoInstants.map((s) => dayjs.utc(s));
  const preDates = fx.isoDates.map((s) => dayjs(s));
  const preRelInstants = fx.relInstants.map((s) => dayjs(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => dayjs(s));
  const nowDj = dayjs(fx.NOW_ISO);
  const todayDj = dayjs(fx.TODAY_ISO);

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = dayjs(fx.isoDates[i]);
        sum += d.year() + (d.month() + 1) + d.date();
      }
      for (let i = 0; i < 2500; i++) {
        const z = dayjs.utc(fx.isoInstants[i]);
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
          .add((i % 10) + 1, 'day')
          .add((i % 5) + 1, 'month')
          .startOf('month')
          .endOf('isoWeek');
        sum += wEnd.date() + (wEnd.month() + 1);
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        out[i] = dayjs(fx.dstInstants[i])
          .tz('America/New_York')
          .add(2, 'day')
          .tz('Europe/Berlin')
          .format('YYYY-MM-DD HH:mm');
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += preInstants[i + 500].diff(preInstants[i], 'hour');
        sum += preDates[(i + 500) % preDates.length].diff(preDates[i], 'day');
      }
      const copy = shuffled.slice().sort((a, b) => a.valueOf() - b.valueOf());
      return sum + (copy[0].valueOf() % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = preRelInstants[i].locale(i % 2 === 0 ? 'en' : 'de').from(nowDj);
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = dayjs(o.dueDate);
        if (due.isBefore(todayDj, 'day')) {
          rows.push({ created: dayjs(o.createdAt).tz('America/New_York'), due });
        }
      }
      rows.sort((a, b) => b.created.valueOf() - a.created.valueOf());
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        last = `${rows[i].created.format('lll')} (${rows[i].created.from(nowDj)})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        let cursor = dayjs(new Date(year, month - 1, 1)).startOf('isoWeek');
        for (let c = 0; c < 42; c++) {
          const isToday = cursor.isSame(todayDj, 'day');
          const inMonth = cursor.month() + 1 === month;
          const dow = cursor.day();
          const isWeekend = dow === 0 || dow === 6;
          const hasEvent = fx.eventDateSet.has(cursor.format('YYYY-MM-DD'));
          if (inMonth && !isWeekend && (hasEvent || isToday)) hits++;
          cursor = cursor.add(1, 'day');
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const busy = fx.busyIntervals.map((b) => [dayjs(b.start).valueOf(), dayjs(b.end).valueOf()]);
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const dayStr = fx.bookingWorkdays[d];
        let slot = dayjs.tz(`${dayStr} 09:00`, 'America/New_York');
        const dayEnd = dayjs.tz(`${dayStr} 17:00`, 'America/New_York');
        while (slot.valueOf() < dayEnd.valueOf()) {
          const next = slot.add(30, 'minute');
          const sMs = slot.valueOf();
          const eMs = next.valueOf();
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
