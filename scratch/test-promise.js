'use strict';

const CreateItinerary = require('../app/create-itin.js');
const TripData = require('../../trip-data');
const Promise = require('promise');
const logger = require('../../my-logger');

    const tripData = new TripData('departure-city-test');
    tripData.data.departureCountry = "usa";
    tripData.data.country = "india";
    tripData.data.startDate = "2017-01-11";
    tripData.data.departureCity = "seattle";
    tripData.data.name = "departure-city-test";
    const createItin = new CreateItinerary(tripData);
    const promise = createItin.create();
    promise().done(
      function(result) {
        console.log("test-promise: I was called! ${result}");
      },
      function(err) {
        logger.error(`Error calling create: ${err}`);
        throw err;
    });
