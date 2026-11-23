import { date } from 'native-dates';

export default () => date('2026-03-07').plus(2, 'days').format('YYYY-MM-DD');
