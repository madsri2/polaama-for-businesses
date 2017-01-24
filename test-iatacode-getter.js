'use strict';
const IataCodeGetter = require('./iatacode-getter');

function testGetIataCode() {
  (new IataCodeGetter("reykjavik")).getCode(function(code) {
    console.log(`code is ${code}`);
  });
}

testGetIataCode();
