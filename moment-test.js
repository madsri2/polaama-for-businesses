var moment = require('moment');

const startDate = moment(new Date("11/18/18").toISOString());
const now = moment();
const days = startDate.diff(now, 'days');
/*
const b = a.add(5,'days');
const c = moment();
const num = c.diff(b,'days');
console.log(num);
*/
console.log(`Difference is ${days} days`);
