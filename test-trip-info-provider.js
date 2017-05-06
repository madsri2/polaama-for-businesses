'use strict';
const TripInfoProvider = require('./trip-info-provider');
const TripData = require('./trip-data');
const fs = require('fs');
const _ = require('lodash');

function testGetWeatherInformation() {
  const tripData = new TripData("Test Trip");
  tripData.data.country = "India";
  tripData.data.startDate = "11/1/17";
  tripData.data.cities = ["Mumbai", "Chennai"];
  const tip = new TripInfoProvider(tripData);
  tip.getWeatherInformation(function() {
    // read from the tripData file and output the value.
    fs.readFile(tripData.tripDataFile(), function(err,data) {
      if(_.isNull(err)) {
        console.log(`value in file is ${data}`);
      }
      else {
        console.log(`Error reading file: ${JSON.stringify(err)}`);
      }
    });
  });
}

function testGetStoredWeatherDetails() {
  const tripData = new TripData("Test Trip");
  tripData.data.country = "India";
  tripData.data.startDate = "11/1/17";
  tripData.data.cities = ["Mumbai", "Chennai"];
  const tip = new TripInfoProvider(tripData);
  const weatherDetails = tip.getStoredWeatherDetails();
  console.log(JSON.stringify(weatherDetails));
}

function testGetActivity() {
  const tripData = new TripData("Portugal");
  tripData.data.country = "portugal";
  tripData.data.startDate = "9/12/17";
  tripData.data.cities = ["lisbon"];
  const tip = new TripInfoProvider(tripData);
  tip.getActivities(function() {
    // read from the tripData file and output the value.
    fs.readFile(tripData.tripDataFile(), function(err,data) {
      if(_.isNull(err)) {
        const tripData = JSON.parse(data);
        console.log(`value in file is ${tripData.cities.lisbon.activities}`);
      }
      else {
        console.log(`Error reading file: ${JSON.stringify(err)}`);
      }
    });
  });
}

function testGetFlightQuoteDetails() {
  const tripData = new TripData("test-austin");
  const tripDetails = {
    destination: "usa",
    startDate: "6/1/17",
    duration: 5,
  };
  tripData.addTripDetailsAndPersist(tripDetails);
  tripData.addCityItinerary(["austin"],[5]);
  tripData.addPortOfEntry("austin");
  const tip = new TripInfoProvider(tripData, "san francisco");
  tip.getFlightQuotes().then(
    function(result) {
      return tip.getStoredFlightQuotes();
    },
    function(err) {
      console.log(`error thrown when trying to get flight quotes: ${err.stack}`);
      throw new Error(err);
    }
  ).done(
    function(result) {
      console.log(`quotes: ${JSON.stringify(result)}`);
    },
    function(err) {
      console.log(`error thrown when trying to read stored flight quotes: ${err.stack}`);
    }
  );
}

function testGetFlightQuoteDetailsTripStarted() {
  const tripData = new TripData("test-austin");
  tripData.addTripDetailsAndPersist({
    destination: "usa",
    startDate: "5/1/17",
    tripStarted: true,
    duration: 6
  });
  const tip = new TripInfoProvider(tripData, "san francisco");
  tip.getFlightQuotes().then(
    function(result) {
      console.log(`Expected result is true. Actual result is ${result}`);
    },
    function(err) {
      console.log(`Error when testing trip started: ${err.stack}`);
      throw err;
    }
  );
  tip.getStoredFlightQuotes().then(
    function(result) {
      console.log(`Expected noflight key to exist. Actual noflight key value: ${result.noflight}`);
    },
    function(err) {
      console.log(`Error when testing trip started: ${err.stack}`);
    }
  );
}

// testGetFlightQuoteDetails();
testGetFlightQuoteDetailsTripStarted();

// testGetActivity();
// testGetWeatherInformation();
// testGetStoredWeatherDetails();
