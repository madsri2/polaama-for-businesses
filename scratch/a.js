'use strict';
const B = require('./b');

function A() {
  console.log("A's constructor called");
  this.b = new B();
}

A.f1 = function() {
  console.log("f1 called");
}

module.exports = A;
