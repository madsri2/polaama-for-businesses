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
  // Iceland
  const td = new TripData("iceland");
  td.addTripDetailsAndPersist({
    startDate: "5/10/2017",
    destination: "iceland",
    duration: 8,
  });
  td.addCityItinerary(["landmannalaugar","reykjavik"],[4,4]);
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

function setup() {
  // set up
  const myFbid = "123";
  const tripName = "test-extractCityDetails";
  const sessions = Sessions.get();
  // first clean up previous test state
  sessions.testing_delete(myFbid);
  new TripData(tripName).testing_delete();
  const session = sessions.findOrCreate(myFbid);
  // create new trip
  const handler = new WebhookPostHandler(session, true /* testing */);
  handler.testing_createNewTrip({
    destination: tripName,
    startDate: moment().add(7, 'days').format("MM/DD/YYYY"), // 05/10/2017,
    duration: 10
  });
  session.persistHometown("san francisco");
  return handler;
}

function testExtractingCityDetails() {
  const handler = setup();
  const session = handler.session;
  // setup state
  session.planningNewTrip = true;
  session.awaitingCitiesForNewTrip = true;
  // test
  const event = { message: { text: "city(1),cityx(2),city y(3)" } };
  handler.testing_determineResponseType(event);
}

function testAddingCityToExistingTrip() {
  const handler = setup();
  const session = handler.session;
  // first add three cities.
  // setup state
  session.planningNewTrip = true;
  session.awaitingCitiesForNewTrip = true;
  // test
  {
    const event = { message: { text: "city(1),cityx(2),city y(3)" } };
    handler.testing_determineResponseType(event);
  }
  logger.debug(`*************** Existing Trip *****************`);
  // setup state
  session.awaitingCitiesForExistingTrip = true;
  // now test adding 4th city
  const event = { message: { text: "another city(6)" } };
  handler.testing_determineResponseType(event);
}

testAddingCityToExistingTrip();
// testExtractingCityDetails();

// testGatheringDetailsForNewTrip();
