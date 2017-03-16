'use strict';

const CreateItinerary = require('../app/create-itin.js');
const TripData = require('../../trip-data');

describe("Test Create Itinerary functionality", function() {
  it("basic test", function() {
    const tripData = new TripData('india');
    const createItin = new CreateItinerary(tripData);
    createItin.create();
  });
});
