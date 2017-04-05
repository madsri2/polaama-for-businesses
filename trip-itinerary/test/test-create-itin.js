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
    const createItin = new CreateItinerary(tripData, "seattle");
    createItin.create();
  });

  it("testing set departure city details", function(done) {
    // set up
    const tripData = new TripData('departure-city-test');
    tripData.data.departureCountry = "usa";
    tripData.data.country = "india";
    tripData.data.startDate = "2017-01-11";
    tripData.data.name = "departure-city-test";
    // call the function under test
    const createItin = new CreateItinerary(tripData, "seattle");
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

  function verifyItinExpectations(dayItin, city) {
    expect(dayItin.city).to.equal(city);
    expect(dayItin).to.include.keys('weather');
    const weather = dayItin.weather;
    expect(weather).to.include.keys('min_temp');
    expect(weather).to.include.keys('max_temp');
    expect(weather).to.include.keys('chanceofrain');
    expect(weather).to.include.keys('cloud_cover');
  }

  it("testing entire itinerary", function(done) {
    // set up
    const cityItin = {
      'chennai': "4",
      'mumbai': "3",
      'goa': "2"
    };
    const startDate = "2017-10-11";
    const startTime = "09:00";
    const portOfEntry = "chennai";
    const tripData = new TripData('full-itin-test');
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.startTime = startTime;
    tripData.data.name = "full-itin-test";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-10-20";
    tripData.data.departureTime = "11:00";
    // call
    const createItin = new CreateItinerary(tripData, "seattle");
    const promises = createItin.create();
    Promise.all(promises).done(
      function(values){
        const details = createItin.getItinerary();
        logger.debug(`Itinerary details: ${JSON.stringify(details)}`);
        // verify departure date
        const stDateStr = CreateItinerary.formatDate(new Date(startDate));
        expect(details).to.include.keys(stDateStr);
        verifyItinExpectations(details[stDateStr], 'seattle');
        expect(details[stDateStr].startTime).to.equal(startTime);
        let nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        // verify port of entry & remaining itinerary
        Object.keys(cityItin).forEach(city => {
          let numDays;
          if(city === tripData.data.portOfEntry) {
            numDays = parseInt(cityItin[city]) / 2;
          }
          else {
            numDays = parseInt(cityItin[city]);
          }
          logger.debug(`Staying for ${numDays} days in city ${city}`);
          for(let i = 0; i < numDays; i++) {
            const nextDayStr = CreateItinerary.formatDate(nextDay);
            verifyItinExpectations(details[nextDayStr], city);
            nextDay.setDate(nextDay.getDate() + 1);
          }
        });
        // verify port of departure
        const remainingDays = parseInt(cityItin[portOfEntry]) - parseInt(cityItin[portOfEntry])/2;
        for(let i = 0; i < remainingDays; i++) {
          const nextDayStr = CreateItinerary.formatDate(nextDay);
          verifyItinExpectations(details[nextDayStr], portOfEntry);
          nextDay.setDate(nextDay.getDate() + 1);
        }
        // nextDay has advanced beyond the return date, so get it back.
        nextDay.setDate(nextDay.getDate() - 1);
        const nextDayStr = CreateItinerary.formatDate(nextDay);
        expect(nextDayStr).to.equal(CreateItinerary.formatDate(new Date(tripData.data.returnDate)));
        expect(details[nextDayStr].departureTime).to.equal(tripData.data.departureTime);
        // tell mocha that the asynchronous work is done
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

