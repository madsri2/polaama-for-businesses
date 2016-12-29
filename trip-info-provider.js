'use strict';
const fs = require('fs');
const _ = require('lodash');
const WeatherInfoProvider = require('./weather-info-provider');
const ActivityInfoProvider = require('./activity-info-provider');
const logger = require('./my-logger');
const TripData = require('./trip-data');

/* Class to handle manipulation of the trips/israel-data.txt file. */
function TripInfoProvider(tripData) {
  this.trip = tripData;
  this.weatherInfoProvider = new WeatherInfoProvider(tripData.data.destination, tripData.data.startDate);
  try {
    this.tripDetails = JSON.parse(fs.readFileSync(this.trip.tripDataFile(),'utf8'));
  }
  catch(err) {
    logger.info(`could not read trip details from file ${this.trip.tripDataFile()}. ${err.stack}`);
    this.tripDetails = {};
    this.tripDetails.cities = {};
  }
}

function encodeForLonelyPlanet() {
  if(_.isUndefined(this.trip.destination)) {
    logger.warn("encodeForLonelyPlanet: No country specified in trip");
    return undefined;
  }
  return this.trip.destination.replace(/ /g,'-').replace(/_/g,'-').toLowerCase();
}

// callback function meant to be called by WeatherInfoProvider.getWeather 
function handleGetWeatherResponse(city, weatherDetails) {
  if(_.isUndefined(weatherDetails)) {
    logger.error(`could not get weather information for city ${city}`);
    if(this.invokeWCallback) {
      this.invokeWCallback = false;
      return this.callback();
    }
  }
  const text = [];
  text.push(`The average weather when you are traveling is a max of ${weatherDetails.max_temp}F and a min of ${weatherDetails.min_temp}F`);
  text.push(`It will be ${weatherDetails.cloud_cover} in ${city}`);
  text.push(`There's a ${weatherDetails.tempoversixty} % chance of temperature over 60F`);
  text.push(`There's a ${weatherDetails.chanceofrain} % chance of rain`);
  const lpEncodedCountry = encodeForLonelyPlanet.call(this);
  if(!_.isUndefined(lpEncodedCountry)) {
    // TODO: Extract this information and present it to the user rather than just show url
    text.push(`Check https://www.lonelyplanet.com/${lpEncodedCountry}/weather to see if you are traveling in the low, shoulder or high season`); 
  }
  logger.info(`The text value is <${text}>`);
  this.tripDetails.cities[city].weather = text;
  try {
    logger.info(`writing trip details information to trip data file`);
    // TODO: Instead of writing for every city, gather all weather information and then write to the file just once.
    fs.writeFileSync(this.trip.tripDataFile(),JSON.stringify(this.tripDetails));
  }
  catch(err) {
    logger.error(`Cannot write tripData details to file ${this.trip.tripDataFile()}. Error is ${err.stack}`);
  }
  // call the callback that was passed to getWeatherInformation if we are asked to.
  if(this.invokeWCallback) {
    this.invokeWCallback = false;
    return this.callback();
  }
  return;
}

TripInfoProvider.prototype.getStoredWeatherDetails = function() {
  const weather = {};
  if(_.isUndefined(this.trip.data.cities)) {
    weather.nocity = `No city present in trip ${this.trip.data.name}`;
    return weather;
  }
  this.trip.data.cities.forEach(city => {
    if(!_.isUndefined(this.tripDetails.cities[city]) && 
       !_.isUndefined(this.tripDetails.cities[city].weather)) {
      weather[city] = this.tripDetails.cities[city].weather;
    }
    else {
      weather[city] = [`No weather information available`];
    }
  });
  return weather;
}

TripInfoProvider.prototype.getWeatherInformation = function(callback) {
  if(_.isUndefined(this.trip.data.cities)) {
    logger.error(`getWeatherInformation: No city defined in trip ${this.trip.data.name}. Doing nothing!`);
    return callback();
  }
  this.wCallback = callback;
  this.trip.data.cities.forEach((city,index,a) => {
    if(_.isUndefined(this.tripDetails.cities[city])) {
      this.tripDetails.cities[city] = {};
    }
    // find out if this is the last city. If so, the callback passed to us needs to be invoked.
    if(index == (this.trip.data.cities.length-1)) {
      logger.info(`Gathering weather details for last city ${city}. Asking handleGetWeatherResponse to invoke the callback passed.`);
      if(!_.isUndefined(this.tripDetails.cities[city].weather)) {
        // if we already have weather details for this city, there is nothing else left to do.
        return this.wCallback();
      }
      this.invokeWCallback = true;
    }
    if( _.isUndefined(this.tripDetails.cities[city].weather)) {
      this.weatherInfoProvider.getWeather(city, handleGetWeatherResponse.bind(this));
    }
  });
}

TripInfoProvider.prototype.getFlightDetails = function() {
  // https://developers.google.com/qpx-express/v1/prereqs
}

TripInfoProvider.prototype.getActivities = function(callback) {
  if(_.isUndefined(this.trip.data.cities)) {
    logger.error(`getActivities: No city defined in trip ${this.trip.data.name}. Doing nothing!`);
    return callback(this.tripDetails.cities);
  }
  this.trip.data.cities.forEach((city, index, a) => {
    if(_.isUndefined(this.tripDetails.cities[city])) {
      this.tripDetails.cities[city] = {};
    }
    const aip = new ActivityInfoProvider(this.trip.data.destination, city, this.trip.data.startDate);
    const cityDetails = this.tripDetails.cities[city];
    const cities = this.tripDetails.cities;
    if(index == (this.trip.data.cities.length-1)) {
      // last city. Invoke the callback passed to us after gathering necessary information
      aip.getActivities(function(activityDetails) {
        cityDetails.activity = activityDetails;
        console.log("getActivities: Gathered activities for all cities in the trip. Calling callback()");
        return callback(cities);
      });
    }
    // simply gather information
    aip.getActivities(function(activityDetails) {
      cityDetails.activity = activityDetails;
    });
  }, this);
  return;
}
 

module.exports = TripInfoProvider;
