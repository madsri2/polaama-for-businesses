'use strict';

const expect = require('chai').expect;
const CreateItinerary = require('../app/create-itin');
const TripData = require('../../trip-data');
const Promise = require('promise');
const logger = require('../../my-logger');
logger.setTestConfig(); // indicate that we are logging for a test

describe("Test Create Itinerary functionality", function() {
  it("basic test", function() {
    const tripData = new TripData('india');
    const createItin = new CreateItinerary(tripData);
    createItin.create();
  });

  it("testing set departure city details", function(done) {
    // set up
    const tripData = new TripData('departure-city-test');
    tripData.data.departureCountry = "usa";
    tripData.data.country = "india";
    tripData.data.startDate = "2017-01-11";
    tripData.data.departureCity = "seattle";
    tripData.data.name = "departure-city-test";
    // call the function under test
    const createItin = new CreateItinerary(tripData);
    const promise = createItin.create();
    // verify
    promise().done(
      function(result) {
        const details = createItin.getDetails();
        logger.debug(`Itinerary details: ${JSON.stringify(details)}`);
        expect(details).to.include.keys('india');
        expect(details.india).to.include.keys('seattle');
        expect(details.india.seattle).to.include.keys('weather');
        const weather = details.india.seattle.weather;
        expect(weather).to.include.keys('min_temp');
        expect(weather).to.include.keys('max_temp');
        expect(weather).to.include.keys('chanceofrain');
        expect(weather).to.include.keys('cloud_cover');
        // tell mocha that the asynchronous work is done
        done();
      },
      function(err) {
        logger.error(`Error calling create: ${err}`);
        done(err);
    });
  });
});
