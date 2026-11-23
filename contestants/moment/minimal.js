import moment from 'moment';

export default () => moment.utc('2026-03-07').add(2, 'days').format('YYYY-MM-DD');
