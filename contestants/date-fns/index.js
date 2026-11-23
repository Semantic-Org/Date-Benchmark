import { TZDate, tz } from '@date-fns/tz';
import {
  addDays,
  addMinutes,
  addMonths,
  addYears,
  areIntervalsOverlapping,
  compareAsc,
  compareDesc,
  differenceInCalendarDays,
  differenceInHours,
  endOfWeek,
  format,
  formatDistance,
  intlFormat,
  isBefore,
  isSameDay,
  isValid,
  isWeekend,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { de, enUS } from 'date-fns/locale';

export function auditChecks() {
  const bad = parseISO('2026-02-31');
  const rejectsInvalidCalendar = !isValid(bad);

  const ny = new TZDate('2026-03-07T15:30:00Z', 'America/New_York');
  const berlin = addDays(ny, 2).withTimeZone('Europe/Berlin');
  const springForwardDst = format(berlin, 'yyyy-MM-dd HH:mm');

  const leapYearClamp = format(addYears(parseISO('2024-02-29'), 1), 'yyyy-MM-dd');
  return { rejectsInvalidCalendar, springForwardDst, leapYearClamp };
}

export function firstPaint(fx) {
  const nowDate = parseISO(fx.NOW_ISO);
  let out = intlFormat(
    nowDate,
    { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/Berlin' },
    { locale: 'de-DE' },
  );
  for (let i = 0; i < 50; i++) {
    const created = new TZDate(fx.orders[i].createdAt, 'America/New_York');
    const label = intlFormat(
      created,
      { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' },
      { locale: 'en-US' },
    );
    out = `${label} · ${formatDistance(created, nowDate, { addSuffix: true, locale: enUS })}`;
  }
  return out;
}

export function createContestant(fx) {
  const utc = tz('UTC');
  const preInstants = fx.isoInstants.map((s) => new TZDate(s, 'UTC'));
  const preDates = fx.isoDates.map((s) => parseISO(s));
  const preRelInstants = fx.relInstants.map((s) => parseISO(s));
  const shuffled = fx.isoInstants.slice(0, 1000).map((s) => parseISO(s));
  const nowDate = parseISO(fx.NOW_ISO);
  const todayDate = parseISO(fx.TODAY_ISO);

  return {
    '01_parse_iso'() {
      let sum = 0;
      for (let i = 0; i < fx.isoDates.length; i++) {
        const d = parseISO(fx.isoDates[i]);
        sum += d.getFullYear() + (d.getMonth() + 1) + d.getDate();
      }
      for (let i = 0; i < 2500; i++) {
        const z = parseISO(fx.isoInstants[i], { in: utc });
        sum += z.getFullYear() + z.getHours();
      }
      return sum;
    },

    '02_format_token'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = format(preInstants[i], 'yyyy-MM-dd HH:mm:ss');
      }
      return last;
    },

    '03_format_intl_warm'() {
      let last = '';
      for (let i = 0; i < preInstants.length; i++) {
        last = intlFormat(
          preInstants[i],
          { dateStyle: 'medium', timeStyle: 'short', timeZone: fx.WARM_ZONES[(i * 2 + 1) % 3] },
          { locale: fx.WARM_LOCALES[i % 3] },
        );
      }
      return last;
    },

    '04_format_intl_cold'() {
      let last = '';
      for (let i = 0; i < 400; i++) {
        const [loc, zone] = fx.COLD_PAIRS[i % fx.COLD_PAIRS.length];
        last = intlFormat(
          preInstants[i],
          { dateStyle: 'medium', timeStyle: 'short', timeZone: zone },
          { locale: loc },
        );
      }
      return last;
    },

    '05_calendar_math'() {
      let sum = 0;
      for (let i = 0; i < preDates.length; i++) {
        const shifted = addMonths(addDays(preDates[i], (i % 10) + 1), (i % 5) + 1);
        const wEnd = endOfWeek(startOfMonth(shifted), { weekStartsOn: 1 });
        sum += wEnd.getDate() + (wEnd.getMonth() + 1);
      }
      return sum;
    },

    '06_zoned_dst_math'() {
      const out = new Array(fx.dstInstants.length);
      for (let i = 0; i < fx.dstInstants.length; i++) {
        const ny = new TZDate(fx.dstInstants[i], 'America/New_York');
        const berlin = addDays(ny, 2).withTimeZone('Europe/Berlin');
        out[i] = format(berlin, 'yyyy-MM-dd HH:mm');
      }
      return out;
    },

    '07_diff_and_sort'() {
      let sum = 0;
      for (let i = 0; i < 2000; i++) {
        sum += differenceInHours(preInstants[i + 500], preInstants[i]);
        sum += differenceInCalendarDays(preDates[(i + 500) % preDates.length], preDates[i]);
      }
      const copy = shuffled.slice().sort(compareAsc);
      return sum + (copy[0].getTime() % 1000);
    },

    '08_relative_time'() {
      let last = '';
      for (let i = 0; i < preRelInstants.length; i++) {
        last = formatDistance(preRelInstants[i], nowDate, {
          addSuffix: true,
          locale: i % 2 === 0 ? enUS : de,
        });
      }
      return last;
    },

    '09_app_orders_table'() {
      const rows = [];
      for (let i = 0; i < fx.orders.length; i++) {
        const o = fx.orders[i];
        const due = parseISO(o.dueDate);
        if (isBefore(due, todayDate)) {
          rows.push({ created: new TZDate(o.createdAt, 'America/New_York'), due });
        }
      }
      rows.sort((a, b) => compareDesc(a.created, b.created));
      let last = '';
      for (let i = 0; i < rows.length; i++) {
        const text = intlFormat(
          rows[i].created,
          { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' },
          { locale: 'en-US' },
        );
        last = `${text} (${formatDistance(rows[i].created, nowDate, { addSuffix: true, locale: enUS })})`;
      }
      return rows.length + last.length;
    },

    '10_app_month_grid'() {
      let hits = 0;
      for (let m = 0; m < fx.calendarMonths.length; m++) {
        const { year, month } = fx.calendarMonths[m];
        let cursor = startOfWeek(new Date(year, month - 1, 1), { weekStartsOn: 1 });
        for (let c = 0; c < 42; c++) {
          const isToday = isSameDay(cursor, todayDate);
          const inMonth = cursor.getMonth() + 1 === month;
          const wknd = isWeekend(cursor);
          const hasEvent = fx.eventDateSet.has(format(cursor, 'yyyy-MM-dd'));
          if (inMonth && !wknd && (hasEvent || isToday)) hits++;
          cursor = addDays(cursor, 1);
        }
      }
      return hits;
    },

    '11_app_booking_slots'() {
      const ny = tz('America/New_York');
      const busy = fx.busyIntervals.map((b) => ({ start: parseISO(b.start), end: parseISO(b.end) }));
      let openCount = 0;
      for (let d = 0; d < fx.bookingWorkdays.length; d++) {
        const dayStr = fx.bookingWorkdays[d];
        let slot = parseISO(`${dayStr}T09:00:00`, { in: ny });
        const dayEnd = parseISO(`${dayStr}T17:00:00`, { in: ny });
        while (isBefore(slot, dayEnd)) {
          const next = addMinutes(slot, 30);
          const candidate = { start: slot, end: next };
          let blocked = false;
          for (let b = 0; b < busy.length; b++) {
            if (areIntervalsOverlapping(candidate, busy[b])) {
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
