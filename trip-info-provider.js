'use strict';
const fs = require('fs');
const _ = require('lodash');
const WeatherInfoProvider = require('./weather-info-provider');
const ActivityInfoProvider = require('./activity-info-provider');
const logger = require('./my-logger');
const TripData = require('./trip-data');
const FlightInfoProvider = require('./flight-info-provider');

/* Class to handle manipulation of the trips/israel-data.txt file. */
function TripInfoProvider(tripData, hometown) {
  this.trip = tripData;
  this.hometown = hometown;
  try {
    this.tripInfoDetails = JSON.parse(fs.readFileSync(this.trip.tripDataFile(),'utf8'));
  }
  catch(err) {
    logger.info(`could not read trip details from file ${this.trip.tripDataFile()}. ${err.message}`);
    this.tripInfoDetails = {};
    this.tripInfoDetails.cities = {};
  }
}

// callback function meant to be called by WeatherInfoProvider.getWeather 
function parseWeatherResponse(city, weatherDetails) {
  if(!weatherDetails) {
    logger.error(`could not get weather information for city ${city}`);
    return;
  }
  const text = [];
  text.push(`The average weather when you are traveling is a max of ${weatherDetails.max_temp}F and a min of ${weatherDetails.min_temp}F`);
  text.push(`It will be ${weatherDetails.cloud_cover} in ${city}`);
  text.push(`There's a ${weatherDetails.tempoversixty} % chance of temperature over 60F`);
  text.push(`There's a ${weatherDetails.chanceofrain} % chance of rain`);
  this.tripInfoDetails.cities[city].weather = text;
  // need to persist the weather information for every city individually because the weather URL for each city will return independently.
  const dataFile = this.trip.tripDataFile();
  try {
    fs.writeFileSync(dataFile,JSON.stringify(this.tripInfoDetails));
  }
  catch(err) {
    logger.error(`Cannot write tripData details to file ${dataFile}. Error is ${err.stack}`);
  }
  return;
}

TripInfoProvider.prototype.getStoredAdditionalWeatherDetails = function() {
  if(_.isUndefined(this.tripInfoDetails.weather)) {
    return "";
  }
  return this.tripInfoDetails.weather;
}

TripInfoProvider.prototype.getStoredWeatherDetails = function() {
  const weather = {};
  if(_.isUndefined(this.trip.data.cities)) {
    weather.nocity = `No city present in trip ${this.trip.data.name}`;
    return weather;
  }
  this.trip.data.cities.forEach(city => {
    if(this.tripInfoDetails.cities[city] && this.tripInfoDetails.cities[city].weather) {
      weather[city] = this.tripInfoDetails.cities[city].weather;
    }
    else {
      weather[city] = [`No weather information available`];
    }
  });
  return weather;
}

function getWeatherForCity(city, index, callback) {
  if(_.isUndefined(this.tripInfoDetails.cities[city])) {
    this.tripInfoDetails.cities[city] = {};
  }
  // find out if this is the last city. If so, the callback passed to us needs to be invoked.
  const tripData = this.trip.data;
  const cities = tripData.cities;
  const cityDetails = this.tripInfoDetails.cities[city];
  if(!_.isUndefined(cityDetails.weather)) {
    // we already have weather details for this city. nothing to do.
    if(index == (cities.length-1)) {
      logger.info(`getWeatherForCity: Details already available for final city ${city} in list. Invoking callback`);
      return callback();
    }
    return;
  }
  const wip = new WeatherInfoProvider(tripData.destination, city, tripData.startDate);
  const self = this;
  wip.getWeather(function(c, weatherDetails) {
    parseWeatherResponse.call(self, c, weatherDetails);
    if(index == (cities.length - 1)) {
      // TODO: There is no guarantee that weather info for other cities have been fetched yet.. Handle this situation 
      logger.info(`Gathered weather details for final city ${c}. Invoking callback`);
      return callback();
    }
  });
}

TripInfoProvider.prototype.getWeatherInformation = function(callback) {
  logger.info(`getWeatherInformation: Callback is ${callback.toString()}`);
  if(_.isUndefined(this.trip.data.cities)) {
    logger.error(`getWeatherInformation: No city defined in trip ${this.trip.data.name}. Doing nothing!`);
    return callback();
  }
  const lpEncodedCountry = encodeForLonelyPlanet.call(this);
  if(!_.isUndefined(lpEncodedCountry)) {
    // TODO: Extract this information and present it to the user rather than just show url
    this.tripInfoDetails.weather = `Check https://www.lonelyplanet.com/${lpEncodedCountry}/weather to see if you are traveling in the low, shoulder or high season`; 
  }
  this.trip.data.cities.forEach((city,index,a) => {
    getWeatherForCity.call(this, city, index, callback);
  }, this);
}

function encodeForLonelyPlanet() {
  if(_.isUndefined(this.trip.data.destination)) {
    logger.warn("encodeForLonelyPlanet: No country specified in trip");
    return undefined;
  }
  return this.trip.data.destination.replace(/ /g,'-').replace(/_/g,'-').toLowerCase();
}

/***************** Flight Details ***************************/

// cx code for flight custom search engine: '016727128883863036563:3i1x6jmqmwu';
// https://developers.google.com/qpx-express/v1/prereqs
TripInfoProvider.prototype.getFlightDetails = function(callback) {
  logger.info(`getFlightDetails: Callback is ${callback.toString()}`);
  const tripData = this.trip.data;
  // TODO: Putting this logic here is a hack. Ideally it would be in webhook-post-handler:startPlanningTrip. But because we are using promise there and I don't know of a clean way to NOT call getFlightDetails if the trip has started, I am placing this code here.
  if(tripData.tripStarted) {
    logger.info(`Trip ${tripData.rawTripName} has already started. Not getting flight details. Simply returning!`);
    return callback();
  }
  const fip = new FlightInfoProvider(this.hometown, tripData.portOfEntry, tripData.startDate, tripData.returnDate);
  try {
    return fip.getFlightDetails(callback);
  }
  catch(err) {
    logger.error(`getFlightDetails: Received exception ${err.message} No flight information`);
    return callback();
  }
}

TripInfoProvider.prototype.getStoredFlightDetails = function() {
  const tripData = this.trip.data;
  if(tripData.tripStarted) {
    return {
      noflight: "Since the trip has already started, no flight information is available.<br>Support for intracity flights will be available soon."
    }
  }
  logger.info(`getStoredFlightDetails: dest: ${tripData.portOfEntry}; tripData: ${JSON.stringify(tripData)}`);
  const fip = new FlightInfoProvider(this.hometown, tripData.portOfEntry, tripData.startDate, tripData.returnDate);
  return fip.getStoredFlightDetails();
}

/***************** Activity Details ***************************/
function getActivityForCity(city, index, callback) {
  if(_.isUndefined(this.tripInfoDetails.cities[city])) {
    this.tripInfoDetails.cities[city] = {};
  }
  // nothing to do if activity details are already present for this city
  const details = this.tripInfoDetails;
  const cityDetails = details.cities[city];
  const cities = this.trip.data.cities;
  const dataFile = this.trip.tripDataFile();
  if(!_.isUndefined(cityDetails.activities)) {
    // handle case where we have gathered data for all cities.
    if(index == (cities.length-1)) {
      logger.info("Invoking callback");
      return callback();
    }
    return;
  }
  const aip = new ActivityInfoProvider(this.trip.data.destination, city, this.trip.data.startDate);
  aip.getActivities(function(activityDetails) {
    cityDetails.activities = activityDetails;
    // handle case where we have gathered data for all cities.
    if(index == (cities.length-1)) {
      // logger.info("getActivities: Gathered activities for all cities. Persisting data and calling callback");
      try {
        fs.writeFileSync(dataFile, JSON.stringify(details));
      }
      catch(e) {
        logger.error(`Cannot write tripData details to file ${dataFile}. Error is ${err.stack}`);
      }
      return callback();
    }
  });
}

TripInfoProvider.prototype.getActivities = function(callback) {
  logger.info(`getActivities: Callback is ${callback.toString()}`);
  if(_.isUndefined(this.trip.data.cities)) {
    logger.error(`getActivities: No city defined in trip ${this.trip.data.name}. Doing nothing!`);
    return callback();
  }
  this.trip.data.cities.forEach((city, index, a) => {
    getActivityForCity.call(this, city, index, callback);
  }, this);
}

TripInfoProvider.prototype.getStoredActivityDetails = function() {
  const activities = {};
  if(_.isUndefined(this.trip.data.cities)) {
    activities.nocity = `No city present in trip ${this.trip.data.name}`;
    return activities;
  }
  this.trip.data.cities.forEach(city => {
    if(!_.isUndefined(this.tripInfoDetails.cities[city]) && 
       !_.isUndefined(this.tripInfoDetails.cities[city].activities)) {
      activities[city] = this.tripInfoDetails.cities[city].activities;
    }
    else {
      activities[city] = [`No activity information available`];
    }
  });
  return activities;
}
 
module.exports = TripInfoProvider;
