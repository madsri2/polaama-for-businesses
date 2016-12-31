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
     this.getWeather(this.city, responseCallback);
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
      max_temp: weather.trip.temp_high.max.F,
      min_temp: weather.trip.temp_high.min.F,
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

/*
const usCities = {
  "Lake_Powell": "UT",
  "Honolulu": "HI",
};
const numCities = Object.keys(usCities).length;
var weatherDetails = {};

function persistWeatherConditions() {
  console.log("Obtained weather condition for all cities and months. persisting ",JSON.stringify(weatherDetails));
  fs.writeFile("weatherInformation", JSON.stringify(weatherDetails), 
  function(err) {
    if(err) {
      console.log(`Could not write to file: ${err.stack}`);
      return;
    }
    console.log("The file was saved");
  });
}

function extractWeatherCondition(body,city,timeRange) {
  var response = JSON.parse(body);
  if((typeof response.trip !== undefined && response.trip) && 
      (typeof response.trip.cloud_cover != undefined && response.trip.cloud_cover) && 
      (typeof response.trip.cloud_cover.cond != undefined && response.trip.cloud_cover.cond)) {
    const condition = response.trip.cloud_cover.cond;
    weatherDetails[city][timeRange] = condition;
    console.log("the forecast for " + city + " for time range " + timeRange + " is ",condition);
    if((timeRange === months[months.length -1]) && (Object.keys(weatherDetails).length == numCities)) { 
      persistWeatherConditions();
    }
  }
  else {
    // retry 3 times.
    if(retry++ < 3) {
      console.log("weather condition undefined. retrying after sleep for 1 second..");
      sleep.sleep(1);
      getWeatherInformation(timeRange,city);
    }
    else {
      console.error("retry failed. cannot obtain weather condition for " + city + " and time range " + timeRange);
    }
  }
}

function getWeatherInformation(timeRange, city) {
  if(!Object.keys(usCities).includes(city)) {
    console.warn("We don't yet support a trip to city: " + city);
    return;
  }
  // wundeground APIs do not accept spaces in city names. They need to be converted into _
  // uri structure: 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_11051110/q/UT/Lake_Powell.json',
  console.log("getting details for city " + city + " and timeRange " + timeRange);
  const uri = 'http://api.wunderground.com/api/16f4fdcdf70aa630/planner_' + timeRange + '/q/' + usCities[city] + '/' + city.replace(/ /g,"_") + '.json';
  request({
    uri: uri,
    method: 'GET',
  }, 
  function(error, res, body) {
    if (!error && res.statusCode == 200) {
      extractWeatherCondition(body,city,timeRange);
    } else {
      console.error("Unable to send message: Response: ",res,"; Error: ",error);
    }
  });
}

function getWeatherForSupportedCities() {
  // get information for the next 12 months for supported cities
  Object.keys(usCities).forEach(function(city) {
      weatherDetails[city] = {};
      months.forEach(function(month) {
        // getWeatherInformation(month,city);
        // wait 20 seconds between every call. We only have a limit of 10 calls per minute.
        var date = new Date();
        console.log("Calling weather information function for ",city, month, date.toTimeString());
        getWeatherInformation(month,city);
        sleep.sleep(20);
      });
  });
}
*/

module.exports = WeatherInfoProvider;
