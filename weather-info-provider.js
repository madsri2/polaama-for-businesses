'use strict';
const sleep = require('sleep');
const logger = require('./my-logger');
const fs = require('fs');
const moment = require('moment');
const TripData = require('./trip-data');
const request = require('request');
// request.debug = true;

function WeatherInfoProvider(country, city, travelDate) {
  this.months = ["01010130","02010228","03010330","04010430","05010530","06010630","07010730","08010830","09010930","10011030","11011130","12011230"];
  // Might be a country or a city. If it's a city in US, the url is different from an international city
  this.country = country; 
  this.travelDate = travelDate;
  this.city = city;
  const isoDate = new Date(travelDate).toISOString();
  const month = moment(isoDate).month() + 1; // moment month() is 0 indexed.
  this.timeRange = this.months[month-1]; 
  this.retry = 0;
}

// TODO: Figure out the directory structure and make it consistent with activities.
function weatherFile() {
  return `/home/ec2-user/weather/${TripData.encode(this.city)}-${this.timeRange}.txt`;
}

WeatherInfoProvider.prototype.getStoredWeather = function(responseCallback) {
  const file = weatherFile.call(this);
  // TODO: Attempted to make this asynchronous, but the callback was not invoked in time from create-itin.js. Fix the issue before making it asynchronous.
  try {
    const data = fs.readFileSync(file, 'utf8');
    return responseCallback(this.city, weatherSummary.call(this, data));
  }
  catch(err) {
    if(err.code === 'ENOENT') {
      // logger.warn(`getStoredWeather: file ${file} is not present. nothing to do`);
    }
    else {
      logger.error(`getStoredWeather: error reading file ${file}: ${err.stack}`);
    }
    return responseCallback(this.city, null);
  }
}

WeatherInfoProvider.prototype.weatherInfoExists = function() {
  if(fs.existsSync(weatherFile.call(this))) return true;
  return false;
}

// International URL: http://api.wunderground.com/api/16f4fdcdf70aa630/planner_11051110/q/Israel/Jerusalem.json
WeatherInfoProvider.prototype.getWeather = function(responseCallback) {
  // first check if we already have a file in the city's name.
  let file = weatherFile.call(this);
  this.wCallback = responseCallback;
  try {
    fs.statSync(file).isFile();
    return responseCallback(this.city, extractWeatherDetails.call(this)); 
  }
  catch(e) {
    if(e.code != 'ENOENT') {
      logger.error(`getWeather: Encountered error: ${e.stack}`);
      return responseCallback(this.city, null);
    }
    // file not present. Get it from wunderground.
    const uri = `http://api.wunderground.com/api/16f4fdcdf70aa630/planner_${this.timeRange}/q/${this.country}/${this.city}.json`;
    // logger.info(`${file} does not exist. Getting it from wunderground with url <${uri}>`);
    request({
      uri: uri,
      method: 'GET',
    }, handleUrlResponse.bind(this));
  }
}

WeatherInfoProvider.prototype.getWeatherStateUri = function(cityCountryList) {
  this.triedWithStateUri = true;
  if(!cityCountryList) return false;
  // if no country was passed to us, assume that this city is in USA!
  const countryName = (this.country) ? this.country.toLowerCase() : "usa";
  for(let idx = 0; idx < cityCountryList.length; idx++) {
    const entry = cityCountryList[idx];
    if(entry.country_name && entry.country_name.toLowerCase() === countryName) {
      const state = entry.state;
      const uri = `http://api.wunderground.com/api/16f4fdcdf70aa630/planner_${this.timeRange}/q/${state}/${this.city}.json`;
      logger.info(`getWeatherStateUri: Getting weather info for city ${this.city} in state ${state} with url <${uri}>`);
      request({
        uri: uri,
        method: 'GET',
      }, handleUrlResponse.bind(this));
      return true;
    }
  }
  logger.error(`getWeatherStateUri: Could not find an entry for country ${countryName} in passed cityCountryList`);
  return false;
}

function writeToFile(body) {
  const file = weatherFile.call(this);
  logger.info(`Writing ${body.length} bytes into file ${file} for city ${this.city}`);
  try {
    fs.writeFileSync(file, body);
  }
  catch(err) {
   logger.error(`could not write data from wunderground into ${file} for city ${this.city}: ${err.stack}`);
   return false;
  } 
  return true;
}

function handleUrlResponse(error, res, body) {
  const responseCallback = this.wCallback;
  if (!error && res.statusCode == 200) {
    const json = JSON.parse(body);
    if(json.response.error) {
      logger.error(`wunderground returned an error for city ${this.city}: ${JSON.stringify(json.response.error)}`);
      return responseCallback(this.city, null);
    }
    if(!json.trip) {
      // see if the state is present. If it is, attempt call with different wunderground API
      let success = false;
      if(json.response.results && !this.triedWithStateUri) success = this.getWeatherStateUri(json.response.results);
      else logger.error(`wunderground response does not contain key "trip" for city ${this.city} and attempting to get "state" information did not work. Keys in wundeground response are ${Object.keys(json)}`);
      // getWeatherStateUri will call the appropriate callback if it was successful
      if(success) return; 
    }
    // Asking wunderground with the same request fields will always yield the same result. So, let's short-circuit that and simply cache the failure.
    if(!writeToFile.call(this, body) || !json.trip) return responseCallback(this.city, null);
    return responseCallback(this.city, extractWeatherDetails.call(this)); 
  } else {
    logger.error(`Unable to send message for city ${this.city}: Response: ${res.statusCode}; Error: ${error}`);
    // retry 3 times.
    if(this.retry++ < 3) {
      // be careful of retrying because wundeground docks you for making more than 10 calls in a 1 minute period (https://www.wunderground.com/weather/api/d/16f4fdcdf70aa630/edit.html). Using 25 seconds so we don't retry more than twice in 1 minute.
      const sleepSec = 25 * this.retry;
      logger.warn(`weather condition undefined for city ${this.city}. retrying after sleep for ${sleepSec} seconds`);
      const timeout = setTimeout(this.getWeather.bind(this), sleepSec * 1000, responseCallback);
      return;
    }
    else {
      logger.error(`3 retries to wunderground API failed. cannot obtain weather condition for ${this.city} and time range ${this.timeRange}`);
    }
  }
  return responseCallback(this.city, null);
}

function extractWeatherDetails() {
  const file = weatherFile.call(this);
  try {
    return weatherSummary.call(this, fs.readFileSync(file));
  }
  catch(err) {
    logger.error(`could not read ${file}. Unable to get weather information: ${err.stack}`);
  }
  return null;
}

function weatherSummary(contents) {
  if(!contents) return null;
  const weather = JSON.parse(contents);
  if(!weather.trip) {
    logger.warn(`weatherSummary: contents of file does not contain key "trip". A failed response to get weather for city ${this.city} has been cached`);
    return null;
  }
  const myWeather = {
    max_temp: weather.trip.temp_high.avg.F,
    min_temp: weather.trip.temp_low.avg.F,
    cloud_cover: weather.trip.cloud_cover.cond,
    tempoversixty: weather.trip.chance_of.tempoversixty.percentage,
    chanceofrain: weather.trip.chance_of.chanceofrainday.percentage
  };
  return myWeather;
}

/******** Testing APIs ******/
WeatherInfoProvider.prototype.testing_weatherFile = function() {
  return weatherFile.call(this);
}

module.exports = WeatherInfoProvider;
