'use strict';
const fs = require('fs');
const logger = require('../../my-logger');
logger.setTestConfig(); // indicate that we are logging for a test
const expect = require('chai').expect;
const CalendarFormatter = require('../app/formatter');
const TripData = require('../../trip-data');
const CreateItinerary = require('../../trip-itinerary/app/create-itin');
const Promise = require('promise');

describe("Calendar tests", function() {
  let tripData;
  let createItin;
  let promises;
  const fbid = "1234";
  let startTime;

  before(function() {
    // set up
    const cityItin = {
      'cities': ['chennai', 'mumbai', 'goa', 'chennai'],
      'numOfDays': ['3', '3', '2', '2']
    };
    const startDate = "2017-11-1";
    startTime = "09:00";
    const portOfEntry = "chennai";
    tripData = new TripData('test-mobile-view', fbid);
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.startTime = startTime;
    tripData.data.arrivalDate = "2017-11-2";
    tripData.data.arrivalTime = "11:00";
    tripData.data.name = "test-mobile-view";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.leavingFrom = "seattle";
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-11-10";
    tripData.data.duration = 10;
    tripData.data.departureTime = "22:00";
    createItin = new CreateItinerary(tripData, "seattle");
    promises = createItin.create();
  });

  after(function() {
    tripData.testing_delete();
  });

  it("mobile view test", function(done) {
    Promise.all(promises).done(
      function(values) {
        // update itinerary to include flight details
        const itinDetails = createItin.getItinerary();
        delete itinDetails.userInputDetails;
        const startDateStr = CreateItinerary.formatDate(new Date(tripData.data.startDate));
        itinDetails[startDateStr].startTime = tripData.data.startTime;
        itinDetails[startDateStr].arrivalTime = tripData.data.arrivalTime;
        const returnDateStr = CreateItinerary.formatDate(new Date(tripData.data.returnDate));
        itinDetails[returnDateStr].startTime = tripData.data.departureTime;
        fs.writeFileSync(tripData.tripItinFile(), JSON.stringify(itinDetails), 'utf8');
        // actual tests
        const formatter = new CalendarFormatter(tripData);
        const html = formatter.formatForMobile("seattle");
        const htmlName = "/tmp/mobile-view-test.html";
        fs.writeFileSync(htmlName, html);
        logger.debug(`Wrote ${html.length} bytes into output file ${htmlName}`);
        expect(html).to.contain("Weather at <b>Seattle");
        expect(html).to.contain("Weather at <b>Chennai");
        expect(html).to.not.contain("undefined&degF");
        expect(html).to.not.contain("undefined%");
        expect(html).to.not.contain("undefined today");
        expect(html).to.contain(`Leaving Seattle at <b>${startTime}`);
        expect(html).to.contain(`Arriving in Chennai at <b>11:00`);
        expect(html).to.contain(`Leaving Chennai at <b>22:00`);
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

  /*
  it("Test getting non-mobile calendar view", function() {
    const tripData = new TripData('test-mobile-view', "1234");
    const formatter = new CalendarFormatter(tripData);
    const html = formatter.format();
    logger.debug(`formatter returned ${html.length} bytes`);
  });
  */
});
