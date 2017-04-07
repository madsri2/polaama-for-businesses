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
    tripData.startDate = "1/1/2018";
    const createItin = new CreateItinerary(tripData, "seattle");
    createItin.create();
  });

  function verifyItinExpectations(dayItin, city) {
    expect(dayItin.city).to.deep.equal(city);
    expect(dayItin).to.include.keys('weather');
    const weather = dayItin.weather;
    if(Array.isArray(weather)) {
      weather.forEach(w => {
        expect(w).to.include.keys('min_temp');
        expect(w).to.include.keys('max_temp');
        expect(w).to.include.keys('chanceofrain');
        expect(w).to.include.keys('cloud_cover');
      });
    }
    else {
      expect(weather).to.include.keys('min_temp');
      expect(weather).to.include.keys('max_temp');
      expect(weather).to.include.keys('chanceofrain');
      expect(weather).to.include.keys('cloud_cover');
    }
  }

  // TODO: This test, while comprehensive has too many implementation details (like calculation numDays and remaining days for portOfEntry. Fix ME! The next test is better.
  it("testing entire itinerary", function(done) {
    // set up
    const cityItin = {
      'chennai': "5",
      'mumbai': "3",
      'goa': "2"
    };
    const startDate = "2017-11-1";
    const startTime = "09:00";
    const portOfEntry = "chennai";
    const tripData = new TripData('full-itin-test');
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.startTime = startTime;
    tripData.data.name = "full-itin-test";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-11-10";
    tripData.data.duration = 10;
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
        verifyItinExpectations(details[stDateStr], ['seattle','chennai']);
        expect(details[stDateStr].startTime).to.equal(startTime);
        let nextDay = new Date(startDate);
        nextDay.setDate(nextDay.getDate() + 1);
        // verify port of entry & remaining itinerary
        let numDays = 0;
        Object.keys(cityItin).forEach(city => {
          if(city === tripData.data.portOfEntry) {
            numDays = Math.ceil(parseInt(cityItin[city]) / 2) - 1; // subtracting 1 because the first day will include port of entry (see above)
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
        const remainingDays = parseInt(cityItin[portOfEntry]) - Math.ceil(parseInt(cityItin[portOfEntry])/2);
        for(let i = 0; i < remainingDays; i++) {
          const nextDayStr = CreateItinerary.formatDate(nextDay);
          logger.debug(`port of departure: Verifying day ${nextDayStr}. Remaining days: ${remainingDays}`);
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

  it("testing presence of user itinerary", function(done) {
    // set up
    const cityItin = {
      'chennai': "2",
    };
    const startDate = "2017-10-11";
    const portOfEntry = "chennai";
    const tripData = new TripData('user-itin-test');
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.name = "user-itin-test";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-10-13";
    const createItin = new CreateItinerary(tripData, "seattle");
    const promises = createItin.create();
    require('fs').writeFileSync(tripData.userInputItinFile(), `{"10/11/2017":["hello world"],"10/12/2017":["h w","h world 1"]}`);
    Promise.all(promises).done(
      function(values){
        const details = createItin.getItinerary();
        expect(details["10/11/2017"].userInputDetails).to.deep.equal(["hello world"]);
        expect(details["10/12/2017"].userInputDetails).to.deep.equal(["h w","h world 1"]);
        // tell mocha that asynchronous work is done;
        done();
      },
      function(err) {
        logger.error(`Error calling create: ${err.message}. stack: ${err.stack}`);
        // tell mocha that the asynchronous work is done
        done(err);
      }
    ); 
  });

  function getCityCount(details,cityItin) {
    const citiesInItin = {};
    Object.keys(cityItin).forEach(city => {
      citiesInItin[city] = 0;
    });
    Object.keys(details).forEach(thisDate => {
      const cityList = details[thisDate].city;
      if(Array.isArray(cityList)) {
        cityList.forEach(city => {
          citiesInItin[city]++;
        });
      }
      citiesInItin[cityList]++;
    });
    return citiesInItin;
  }

  // test that the duration of each city matches the number of days for that particular city in the created itinerary
  it("test city duration in itinerary", function(done) {
    const cityItin = {
      'chennai': "5",
      'mumbai': "3",
      'goa': "2"
    };
    const startDate = "2017-11-1";
    const startTime = "09:00";
    const portOfEntry = "chennai";
    const tripData = new TripData('full-itin-test');
    tripData.data.country = "india";
    tripData.data.startDate = startDate;
    tripData.data.startTime = startTime;
    tripData.data.name = "full-itin-test";
    tripData.data.portOfEntry = portOfEntry;
    tripData.data.cityItin = cityItin;
    tripData.data.returnDate = "2017-11-10";
    tripData.data.duration = 10;
    tripData.data.departureTime = "11:00";
    // call
    const createItin = new CreateItinerary(tripData, "seattle");
    const promises = createItin.create();
    Promise.all(promises).done(
      function(values) {
        const details = createItin.getItinerary();
        logger.debug(`Itinerary details: ${JSON.stringify(details)}`);
        cityItin["seattle"] = 1;
        const citiesInItin = getCityCount(details, cityItin);
        Object.keys(cityItin).forEach(city => {
          expect(parseInt(cityItin[city])).to.equal(citiesInItin[city]);  
        });
        // ensure that the number of entries in itinerary match the duration.
        expect(Object.keys(details).length).to.equal(tripData.data.duration);
        done();
      },
      function(err) {
        logger.error(`Error: ${err.stack}`);
        done(err);
      }
    );
  });
});

