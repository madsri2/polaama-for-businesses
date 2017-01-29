'use strict';
const TripData = require('./trip-data');
const TripInfoProvider = require('./trip-info-provider');
const Promise = require('promise');

function testGatheringDetailsForNewTrip() {
  const dtdCallback = function() { 
    console.log("All callbacks successfully called");
  }
  /* 
  // Portugal
  const td = new TripData("portugal");
  td.addCities(["lisbon", "obidos", "lagos"]);
  td.addPortOfEntry("lisbon");
  const tip = new TripInfoProvider(td, "seattle");
  */
  // Iceland
  const td = new TripData("iceland");
  td.addCities(["landmannalaugar","reykjavik"]);
  td.addPortOfEntry("reykjavik");
  const tip = new TripInfoProvider(td, "seattle");
  
  const activities = Promise.denodeify(tip.getActivities.bind(tip));
  const flightDetails = Promise.denodeify(tip.getFlightDetails.bind(tip));
  const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));
  
  activities()
    .then(flightDetails())
    .then(weatherDetails())
    .done(function() {
      console.log("all functions called.");
    }, function(err) {
      console.log(`error: ${err.stack}`);
    });
}

function testDetermineResponseType() {
}

testGatheringDetailsForNewTrip();
