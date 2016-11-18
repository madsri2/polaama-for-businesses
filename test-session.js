'use strict';

const s1 = require('./session');
const s = new s1();
console.log(s.findOrCreate("1",["a"]));
console.log(s.find("1"));
