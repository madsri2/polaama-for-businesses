'use strict';

const CalendarFormatter = require('../app/formatter');
const TripData = require('../../trip-data');

describe("Calendar view tests", function() {
  it("Test getting calendar view", function() {
    const tripData = new TripData('india');
    const formatter = new CalendarFormatter(tripData);
    console.log(formatter.format());
  });
});
