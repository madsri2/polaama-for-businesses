'use strict';

const s = new Date("2017-11-01");
const c = `${s.getFullYear()}-${s.getMonth() + 1}-${s.getDate()}`;
console.log(`cityStartDate: ${c} ${s.getMonth()}`);
