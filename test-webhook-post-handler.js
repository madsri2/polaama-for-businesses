'use strict';
const baseDir = "/home/ec2-user";
const Sessions = require(`${baseDir}/sessions`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const TripData = require(`${baseDir}/trip-data`);
const TripInfoProvider = require(`${baseDir}/trip-info-provider`);
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

const moment = require('moment');
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
  td.addTripDetailsAndPersist({
    startDate: "5/10/2017",
    destination: "iceland",
    duration: 8,
  });
  td.addCities(["landmannalaugar","reykjavik"]);
  td.addPortOfEntry("reykjavik");
  const tip = new TripInfoProvider(td, "seattle");
  
  const activities = Promise.denodeify(tip.getActivities.bind(tip));
  // const flightDetails = Promise.denodeify(tip.getFlightDetails.bind(tip));
  const flightQuote = tip.getFlightQuotes();
  const weatherDetails = Promise.denodeify(tip.getWeatherInformation.bind(tip));
  
  activities()
    // .then(flightDetails())
    .then(weatherDetails())
    .then(flightQuote)
    .done(function() {
      console.log("all functions called.");
    }, function(err) {
      console.log(`error: ${err.stack}`);
    });
}

function testExtractingCityDetails() {
  // set up
  const event = {
    message: {
      text: "city(1),cityx(2),city y(3)"
    }
  };
  const myFbid = "123";
  const tripName = "test-extractCityDetails";
  const sessions = Sessions.get();
  sessions.testing_delete(myFbid);
  new TripData(tripName).testing_delete();
  const session = sessions.findOrCreate(myFbid);
  const handler = new WebhookPostHandler(session, true /* testing */);
  handler.testing_createNewTrip({
    destination: tripName,
    startDate: moment().add(7, 'days').format("MM/DD/YYYY"), // 05/10/2017,
    duration: 10
  });
  session.persistHometown("san francisco");
  session.planningNewTrip = true;
  session.awaitingCitiesForNewTrip = true;
  handler.testing_determineResponseType(event);
}

testExtractingCityDetails();

// testGatheringDetailsForNewTrip();
