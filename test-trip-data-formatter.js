'use strict';
const TripDataFormatter = require('./trip-data-formatter');
const TripData = require('./trip-data');
const TripInfoProvider = require('./trip-info-provider');

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

function testFormatFlightDetails() {
  const trip = new TripData("Test Trip");
  const formatter = new TripDataFormatter(trip);
  /*
  const flightDetails = {
    "Seattle to Lisbon": {
    itin: [{
      options: [{
        price: "123",
        agent: "Agent",
        uri: "http://blah.com"
      }],
      outbound: {
        duration: "20 hours",
        departure: "2017-02-03 10:40",
        arrival: "2017-02-04 06:00",
        stops: "2",
        segments: [{
          departure: "2017-02-03 10:40",
          arrival: "2017-02-03 15:00",
          origin: "SEA",
          destination: "JFK",
          airlines: "JetBlue",
          duration: "3 hours",
          flightNum: "435"
        },
        {
          departure: "2017-02-03 23:50",
          arrival: "2017-02-04 06:00",
          origin: "JFK",
          destination: "LIS",
          airlines: "TAP Portugal",
          duration: "10 hours",
          flightNum: "4435"
        }]
      },
      inbound: {
          duration: "18 hours",
          departure: "2017-02-17 12:40",
          arrival: "2017-02-18 06:00",
          stops: "2",
          segments: [{
            departure: "2017-02-17 12:40",
            arrival: "2017-02-17 16:00",
            origin: "LIS",
            destination: "JFK",
            duration: "10 hours",
            airlines: "JetBlue",
            flightNum: "435"
          },
          {
            departure: "2017-02-17 18:50",
            arrival: "2017-02-18 03:00",
            origin: "JFK",
            destination: "SEA",
            duration: "3 hours",
            airlines: "TAP Portugal",
            flightNum: "4435"
          }]
        },
      }]
    }
  };
  */
  const tip = new TripInfoProvider(new TripData("portugal"), "seattle");
  const flightDetails = tip.getStoredFlightDetails();
  console.log(formatter.formatFlightDetails(flightDetails));
}

testFormatFlightDetails();
// testFormatActivityDetails();
// testFormatWeatherDetails();
