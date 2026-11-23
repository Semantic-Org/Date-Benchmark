import { addDays, format, parseISO } from 'date-fns';

export default () => format(addDays(parseISO('2026-03-07'), 2), 'yyyy-MM-dd');
