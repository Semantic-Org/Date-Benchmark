import { DateTime } from 'luxon';

export default () => DateTime.fromISO('2026-03-07').plus({ days: 2 }).toFormat('yyyy-MM-dd');
