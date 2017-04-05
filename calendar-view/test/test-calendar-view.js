'use strict';
const fs = require('fs');
const logger = require('../../my-logger');

const CalendarFormatter = require('../app/formatter');
const TripData = require('../../trip-data');

describe("Calendar view tests", function() {
  it("Test getting calendar view", function() {
    const tripData = new TripData('india');
    const formatter = new CalendarFormatter(tripData);
    console.log(formatter.format());
  });

  it("mobile view test", function() {
    const tripData = new TripData('full-itin-test');
    const formatter = new CalendarFormatter(tripData);
    const html = formatter.formatForMobile("seattle");
    const htmlName = "/tmp/mobile-view-test.html";
    fs.writeFileSync(htmlName, html);
    logger.debug(`Wrote ${html.length} bytes into output file ${htmlName}`);
  });
});
