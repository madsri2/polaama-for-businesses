'use strict';
const TripDataFormatter = require('./trip-data-formatter');
const TripData = require('./trip-data');

function testFormatWeatherDetailsNoCity() {
  const trip = new TripData('Test Trip');
  const formatter = new TripDataFormatter(trip);
  const weatherDetails = {
    nocity: "No city present in trip test-trip"
  };
  console.log(formatter.formatWeatherDetails(weatherDetails));
}

function testFormatWeatherDetails() {
  const trip = new TripData('Test Trip');
  const formatter = new TripDataFormatter(trip);
  const weatherDetails = {
    "city1": ["Weather https://secure.polaama.com comment 1", "Weather comment 2"],
    "city2": ["Weather comment 1a", "Weather comment 2a"]
  };
  console.log(formatter.formatWeatherDetails(weatherDetails, "hello http://google.com world"));
}

function testFormatActivityDetails() {
  const trip = new TripData("Test Trip");
  const formatter = new TripDataFormatter(trip);
  const activityDetails = {
    "city1": ["link 1", "link 2"],
    "city2": ["link 1a", "link 2a"]
  };
  console.log(formatter.formatActivityDetails(activityDetails));
}

// testFormatActivityDetails();
testFormatWeatherDetails();
