var moment = require('moment');

function testDiff() {
const startDate = moment(new Date("11/18/18").toISOString());
const now = moment();
const days = startDate.diff(now, 'days');
console.log(`Difference is ${days} days`);
}

function testAddAndDiff() {
/*
const b = a.add(5,'days');
const c = moment();
const num = c.diff(b,'days');
console.log(num);
*/
}

function testFormat() {
  const startDate = moment(new Date("11/18/18").toISOString());
  console.log(startDate.format("YYYY-MM-DD"));
}

testFormat();
