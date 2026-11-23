import { addDay, date, format } from '@formkit/tempo';

export default () => format(addDay(date('2026-03-07'), 2), 'YYYY-MM-DD', 'en-US');
