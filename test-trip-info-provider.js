'use strict';
const TripInfoProvider = require('./trip-info-provider');
const TripData = require('./trip-data');
const fs = require('fs');
const _ = require('lodash');

function testGetWeatherInformation() {
  const tripData = new TripData("Test Trip");
  tripData.data.destination = "India";
  tripData.data.startDate = "11/1/17";
  tripData.data.cities = ["Mumbai", "Chennai"];
  const tip = new TripInfoProvider(tripData);
  tip.getWeatherInformation();
  // read from the tripData file and output the value.
  fs.readFile(tripData.tripDataFile(), function(err,data) {
    if(_.isNull(err)) {
      console.log(`value in file is ${data}`);
    }
    else {
      console.log(`Error reading file: ${JSON.stringify(err)}`);
    }
  });
}

function testGetStoredWeatherDetails() {
  const tripData = new TripData("Test Trip");
  tripData.data.destination = "India";
  tripData.data.startDate = "11/1/17";
  tripData.data.cities = ["Mumbai", "Chennai"];
  const tip = new TripInfoProvider(tripData);
  const weatherDetails = tip.getStoredWeatherDetails();
  console.log(JSON.stringify(weatherDetails));
}

testGetWeatherInformation();
testGetStoredWeatherDetails();
