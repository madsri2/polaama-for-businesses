'use strict';
const fs = require('fs');
const logger = require('../../my-logger');
logger.setTestConfig(); // indicate that we are logging for a test
const expect = require('chai').expect;
const CalendarFormatter = require('../app/formatter');
const TripData = require('../../trip-data');
const CreateItinerary = require('../../trip-itinerary/app/create-itin');
const Promise = require('promise');

describe("Calendar view tests", function() {
  // TODO: Fix ME! Add 
  it("Test getting calendar view", function() {
    const tripData = new TripData('india');
    const formatter = new CalendarFormatter(tripData);
    const html = formatter.format();
    logger.debug(`formatter returned ${html.length} bytes`);
  });

  it("mobile view test", function(done) {
    // set up
    const cityItin = {
      'chennai': "5",
      'mumbai': "3",
      'goa': "2"
    };
    const startDate = "2017-11-1";
    const startTime = "09:00";
    const portOfEntry = "chennai";
    const tripData = new TripData('mobile-view-test');
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.startTime = startTime;
    tripData.data.arrivalDate = "2017-11-2";
    tripData.data.arrivalTime = "11:00";
    tripData.data.name = "mobile-view-test";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-11-10";
    tripData.data.duration = 10;
    tripData.data.departureTime = "22:00";
    const createItin = new CreateItinerary(tripData, "seattle");
    const promises = createItin.create();
    Promise.all(promises).done(
      function(values) {
        const formatter = new CalendarFormatter(tripData);
        const html = formatter.formatForMobile("seattle");
        const htmlName = "/tmp/mobile-view-test.html";
        fs.writeFileSync(htmlName, html);
        logger.debug(`Wrote ${html.length} bytes into output file ${htmlName}`);
        expect(html).to.contain("Seattle/Chennai");
        expect(html).to.not.contain("undefined&degF");
        expect(html).to.not.contain("undefined%");
        expect(html).to.not.contain("undefined today");
        expect(html).to.contain("Leaving Seattle at 09:00");
        expect(html).to.contain("Reach Chennai at 11:00");
        expect(html).to.contain("Leaving Chennai at 22:00");
        // tell mocha we are done
        done();
      },
     function(err) {
        logger.error(`Error calling create: ${err.message}. stack: ${err.stack}`);
        // tell mocha that the asynchronous work is done
        done(err);
     }
    );
  });
});
