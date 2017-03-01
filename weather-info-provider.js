'use strict';
const sleep = require('sleep');
const logger = require('./my-logger');
const fs = require('fs');
const moment = require('moment');
const TripData = require('./trip-data');
const request = require('request');

var retry = 0;

function WeatherInfoProvider(destination, city, travelDate) {
  this.months = ["01010130","02010228","03010330","04010430","05010530","06010630","07010730","08010830","09010930","10011030","11011130","12011230"];
  // Might be a country or a city. If it's a city in US, the url is different from an international city
  this.destination = destination; 
  this.travelDate = travelDate;
  this.city = city;
  const isoDate = new Date(travelDate).toISOString();
  const month = moment(isoDate).month() + 1; // moment month() is 0 indexed.
  this.timeRange = this.months[month-1]; 
}

// TODO: Figure out the directory structure and make it consistent with activities.
function weatherFile() {
  return `weather/${TripData.encode(this.city)}.txt`;
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
      return undefined;
    }
    // file not present. Get it from wunderground.
    const uri = `http://api.wunderground.com/api/16f4fdcdf70aa630/planner_${this.timeRange}/q/${this.destination}/${this.city}.json`;
    const err = new Error();
    logger.info(`${file} does not exist. Getting it from wunderground with url <${uri}>`);
    request({
      uri: uri,
      method: 'GET',
    }, handleUrlResponse.bind(this));
  }
}

function handleUrlResponse(error, res, body) {
  const responseCallback = this.wCallback;
  if (!error && res.statusCode == 200) {
    const json = JSON.parse(body);
    if(json.response.error) {
      logger.error(`wunderground returned an error: ${JSON.stringify(json.response.error)}`);
      return responseCallback(this.city, undefined);
    }
    const file = weatherFile.call(this);
    logger.info(`Writing ${body.length} bytes into file ${file}`);
    try {
      fs.writeFileSync(file, body);
    }
    catch(err) {
     logger.error(`could not write data from wunderground into ${file}: ${err.stack}`);
     return responseCallback(this.city, undefined);
    } 
    return responseCallback(this.city, extractWeatherDetails.call(this)); 
  } else {
   logger.error("Unable to send message: Response: ",res,"; Error: ",error);
   // retry 3 times.
   if(retry++ < 3) {
     logger.warn("weather condition undefined. retrying after sleep for 1 second..");
     sleep.sleep(1);
     return this.getWeather(this.city, responseCallback);
   }
   else {
     logger.error(`3 retries to wunderground API failed. cannot obtain weather condition for ${this.city} and time range ${this.timeRange}`);
   }
 }
 return responseCallback(this.city, undefined);
}

function extractWeatherDetails() {
  let file = weatherFile.call(this);
  try {
    const weather = JSON.parse(fs.readFileSync(file));
    const myWeather = {
      max_temp: weather.trip.temp_high.avg.F,
      min_temp: weather.trip.temp_low.avg.F,
      cloud_cover: weather.trip.cloud_cover.cond,
      tempoversixty: weather.trip.chance_of.tempoversixty.percentage,
      chanceofrain: weather.trip.chance_of.chanceofrainday.percentage
    };
    return myWeather;
  }
  catch(err) {
    logger.error(`could not read ${file}. Unable to get weather information: ${err.stack}`);
  }
  return undefined;
}

module.exports = WeatherInfoProvider;
