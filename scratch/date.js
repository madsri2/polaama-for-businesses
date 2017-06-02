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

mdt();
