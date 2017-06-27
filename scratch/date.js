'use strict';
const moment = require('moment');
const momentTz = require('moment-timezone');

// const s = new Date("4/20/2017");
// const c = `${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()}`;
// console.log(`cityStartDate: ${c} ${s.getMonth()}`);
// const s = "2017-05-01";

function date() {
const s = new Date("May 1 2017 11:30 AM").toISOString();
console.log(`${s}; ${moment(s)}`);
}

function mdt() {
  console.log(momentTz().tz("America/Cambridge_Bay").add(1, 'days').format("M/D/YYYY"));
}

function singleDigitMonth() {
  const t = "2016-06-10T10:45";
  console.log(moment(t).format("YYYY-MM-DDTHH:mm"));
}

function scratch() {
  const t = new Date("2017-11-10");
  const t1 = t.setDate(t.getDate() + 1);
  console.log(moment(t1).format("YYYY-MM-DD"));
}

function testInvalidTimeRange() {
	const t = moment(new Date("2017-05-30T09:35").toISOString()).format("YYYY-MM-DDTHH:mm");
}

function date(command) {
  let contents = /^(\d+)$/.exec(command);
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  console.log(new Date(thisYear, thisMonth, contents[1]));
}

console.log(momentTz().tz('UTC').format("YYYY-MM-DD HH:mm:ss.SSS"));

// testInvalidTimeRange();

/*
date(15);
date(30);
date(32);
date(1);
*/

// scratch();
// singleDigitMonth();
// mdt();
