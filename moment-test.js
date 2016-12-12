var moment = require('moment');

const a = moment("2016-11-30");
const b = a.add(5,'days');
const c = moment();
const num = c.diff(b,'days');
console.log(num);
