'use strict';
const IataCodeGetter = require('./iatacode-getter');

function testGetIataCode() {
  (new IataCodeGetter("sydney")).getCode(function(code) {
    console.log(`code is ${code}`);
  });
}

testGetIataCode();
