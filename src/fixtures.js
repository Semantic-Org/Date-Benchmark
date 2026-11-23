// Deterministic, non-repeating wire fixtures shared identically across all contestants
const epoch1980 = Date.UTC(1980, 0, 1, 0, 0, 0, 0);
const dstBase = Date.UTC(2026, 2, 6, 12, 0, 0, 0); // 2026-03-06T12:00:00Z (2 days before US spring-forward)

export const NOW_ISO = '2026-06-15T14:30:00.000Z';
export const TODAY_ISO = '2026-06-15';
export const NOW_EPOCH = Date.parse(NOW_ISO);

export const WARM_LOCALES = ['en-US', 'de-DE', 'ja-JP'];
export const WARM_ZONES = ['America/New_York', 'Europe/Berlin', 'Asia/Tokyo'];

export const COLD_PAIRS = [
  ['fr-FR', 'Europe/Paris'],
  ['es-ES', 'Europe/Madrid'],
  ['it-IT', 'Europe/Rome'],
  ['pt-BR', 'America/Sao_Paulo'],
  ['nl-NL', 'Europe/Amsterdam'],
  ['sv-SE', 'Europe/Stockholm'],
  ['pl-PL', 'Europe/Warsaw'],
  ['tr-TR', 'Europe/Istanbul'],
  ['ko-KR', 'Asia/Seoul'],
  ['zh-CN', 'Asia/Shanghai'],
  ['zh-TW', 'Asia/Taipei'],
  ['hi-IN', 'Asia/Kolkata'],
  ['th-TH', 'Asia/Bangkok'],
  ['vi-VN', 'Asia/Ho_Chi_Minh'],
  ['id-ID', 'Asia/Jakarta'],
  ['en-GB', 'Europe/London'],
  ['en-CA', 'America/Toronto'],
  ['en-AU', 'Australia/Sydney'],
  ['es-MX', 'America/Mexico_City'],
  ['ar-EG', 'Africa/Cairo'],
];

export const isoDates = Array.from({ length: 2500 }, (_, i) =>
  new Date(epoch1980 + ((i * 7919 + 1009) % 18000) * 86_400_000).toISOString().slice(0, 10)
);

export const isoInstants = Array.from({ length: 3000 }, (_, i) =>
  new Date(epoch1980 + ((i * 104729 + 3571) % 1_400_000_000) * 1000 + (i % 997)).toISOString()
);

export const dstInstants = Array.from({ length: 1000 }, (_, i) =>
  new Date(dstBase + (i * 5393) * 1000).toISOString()
);

export const relInstants = Array.from({ length: 2000 }, (_, i) => {
  const bucket = i % 5;
  const sign = i % 2 === 0 ? -1 : 1;
  const mag = bucket === 0
    ? ((i * 17) % 45 + 5) * 1000
    : bucket === 1
    ? ((i * 23) % 50 + 2) * 60_000
    : bucket === 2
    ? ((i * 13) % 20 + 2) * 3_600_000
    : bucket === 3
    ? ((i * 7) % 20 + 2) * 86_400_000
    : ((i * 11) % 8 + 2) * 30 * 86_400_000;
  return new Date(NOW_EPOCH + sign * mag).toISOString();
});

export const orders = Array.from({ length: 500 }, (_, i) => ({
  id: i + 1,
  createdAt: new Date(NOW_EPOCH - ((i * 97_103 + 4211) % (45 * 86_400_000))).toISOString(),
  dueDate: new Date(NOW_EPOCH + (((i * 37) % 40) - 20) * 86_400_000).toISOString().slice(0, 10),
}));

export const calendarMonths = Array.from({ length: 12 }, (_, m) => ({ year: 2026, month: m + 1 }));
export const eventDateSet = new Set(
  Array.from({ length: 90 }, (_, i) =>
    new Date(Date.UTC(2026, 0, 1) + ((i * 41 + 3) % 365) * 86_400_000).toISOString().slice(0, 10)
  ),
);

// 4 March 2026 workweeks in America/New_York (Mon Mar 2 .. Fri Mar 27, spanning Mar 8 spring-forward DST)
export const bookingWorkdays = Array.from({ length: 20 }, (_, i) => {
  const week = Math.floor(i / 5);
  const dow = i % 5;
  return new Date(Date.UTC(2026, 2, 2 + week * 7 + dow)).toISOString().slice(0, 10);
});

// 80 deterministic busy [startIso, endIso] UTC intervals during NY business hours (13:00Z..22:00Z)
export const busyIntervals = Array.from({ length: 80 }, (_, i) => {
  const dayIdx = (i * 7 + 3) % 20;
  const dayBase = Date.parse(`${bookingWorkdays[dayIdx]}T14:00:00Z`);
  const offsetMin = ((i * 53) % 14) * 30;
  const durMin = ((i % 3) + 1) * 30;
  const startMs = dayBase + offsetMin * 60_000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + durMin * 60_000).toISOString(),
  };
});
