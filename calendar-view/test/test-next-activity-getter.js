'use strict';
const logger = require('../../my-logger');
logger.setTestConfig(); // indicate that we are logging for a test
const expect = require('chai').expect;
const NextActivityGetter = require('calendar-view/app/next-activity-getter');

describe("NextActivityGetter tests: ", function() {
/*
  it.skip("before first activity", function() {
    // check time 08:30
  });

  it.skip("between first & second activity", function() {
  });

  it.skip("after last activity", function() {
  });

  it.skip("undefined estimatedStart present", function() {
  });

  it.skip("undefined no estimatedStart", function() {
  });
*/
});

describe("NextActivityGetter tests: 6/16 itin", function() {
  it("first", function() {
    // set time to 08:30:
    const nag = new NextActivityGetter(16, true);
    nag.testing_setNow("08:30");
    expect(nag.getNext()).to.equal(1);

    // 11:00
    nag.testing_setNow("11:00");
    expect(nag.getNext()).to.equal(3);

    // 13:00
    nag.testing_setNow("13:00");
    expect(nag.getNext()).to.equal(3);

    // 18:00
    nag.testing_setNow("18:00");
    expect(nag.getNext()).to.equal(5);

    // 20:15
    nag.testing_setNow("20:15");
    expect(nag.getNext()).to.equal(7);

    // 20:30: estimatedTime for dinner
    nag.testing_setNow("20:30");
    expect(nag.getNext()).to.equal(8);

    // 21:30
    nag.testing_setNow("21:30");
    expect(nag.getNext()).to.equal(8);

    // 23:30
    nag.testing_setNow("23:30");
    expect(nag.getNext()).to.equal(8);
  });
});

describe("NextActivityGetter tests: 6/17 itin", function() {
  it("6/17", function() {
    const nag = new NextActivityGetter(17, true);
    nag.testing_setNow("07:50");
    expect(nag.getNext()).to.equal(0);
  
    // 10:00
    nag.testing_setNow("10:00");
    expect(nag.getNext()).to.equal(1);

    nag.testing_setNow("11:45");
    expect(nag.getNext()).to.equal(1);

    // 12:45
    nag.testing_setNow("12:45");
    expect(nag.getNext()).to.equal(2);

    nag.testing_setNow("13:45");
    expect(nag.getNext()).to.equal(3);
  
    nag.testing_setNow("15:20");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("17:23");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("17:39");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("18:05");
    expect(nag.getNext()).to.equal(3);

    // 19:00
    nag.testing_setNow("19:00");
    expect(nag.getNext()).to.equal(4);
  
    // 20:00
    nag.testing_setNow("20:00");
    expect(nag.getNext()).to.equal(5);
  
    nag.testing_setNow("20:45");
    expect(nag.getNext()).to.equal(6);
  
    // 21:15
    nag.testing_setNow("21:15");
    expect(nag.getNext()).to.equal(7);
  
    // 22:55
    nag.testing_setNow("22:55");
    expect(nag.getNext()).to.equal(7);
  
    // 23:15
    nag.testing_setNow("23:15");
    expect(nag.getNext()).to.equal(7);
  });
});

describe("NextActivityGetter tests: 6/15 itin", function() {
  it("6/15", function() {
  const nag = new NextActivityGetter(15, true);
  // 07:00
  nag.testing_setNow("07:00");
  expect(nag.getNext()).to.equal(0);

  // 09:00
  nag.testing_setNow("09:00");
  expect(nag.getNext()).to.equal(1);
  
  // 12:30
  nag.testing_setNow("12:31");
  expect(nag.getNext()).to.equal(3);

  // 13:20
  nag.testing_setNow("13:20");
  expect(nag.getNext()).to.equal(4);

  // 15:00
  nag.testing_setNow("15:00");
  expect(nag.getNext()).to.equal(5);

  // 17:00
  nag.testing_setNow("17:00");
  expect(nag.getNext()).to.equal(5);

  // 18:15
  nag.testing_setNow("18:15");
  expect(nag.getNext()).to.equal(6);

  // 19:30
  nag.testing_setNow("19:30");
  expect(nag.getNext()).to.equal(7);

  // 20:15
  nag.testing_setNow("20:15");
  expect(nag.getNext()).to.equal(7);

  // 20:45
  nag.testing_setNow("20:45");
  expect(nag.getNext()).to.equal(8);
  });
});
