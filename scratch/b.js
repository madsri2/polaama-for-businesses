'use strict';
const A = require('./a');

function B() {
  console.log("B's constructor called");
  A.f1();
}

module.exports = B;
