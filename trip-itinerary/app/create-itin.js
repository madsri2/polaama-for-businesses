'use strict';
const logger = require('../../my-logger');
const fs = require('fs');
const WeatherInfoProvider = require('../../weather-info-provider');
const Promise = require('promise');

function CreateItinerary(trip, departureCity) {
  this.trip = trip;
  this.tripData = trip.data;
  this.tripName = trip.data.name;
  this.departureCity = departureCity;
  setDepartureCountry.call(this, departureCity);
}  

function setDepartureCountry(city) {
  // TODO: for now, assume that departureCountry is always usa. Change that later.
  this.departureCountry = "usa";
}

CreateItinerary.formatDate = function(date) {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}
const formatDate = CreateItinerary.formatDate; // shortcut for use in this file.

/* The itinerary format is 
  '11/10/2017': {
    city: "seattle",
    weather: {
      temp: 54,
      rain_chance: "80%",
      weather: "rainy"
    },
    leave: "09:00"
  },
  '11/11/2017': {
    city: "chennai",
    arrival: "10:00",
    visit: ["pulicat lake", "marina beach"]
  },
  ...
  '11/12/2017': {
    city: "chennai",
    leave: "22:00",
    visit: ["ranganathan street"]
  }
*/
CreateItinerary.prototype.create = function() {
  this.itin = {};
  if(!this.tripData.cityItin) {
    throw new Error(`CreateItinerary: cityItin not defined in tripData. Nothing to do!`);
  }
  // nextDay represents the day for which the itinerary needs to be set. Starts with startDate.
  if(!this.tripData.startDate) {
    throw new Error(`CreateItinerary: startDate not defined in tripData. Nothing to do!`);
  }
  this.nextDay = new Date(this.tripData.startDate);
  this.destinationCountry = this.tripData.country;
  const promiseList = [];
  promiseList.push(setDepartureCityDetails.call(this));
  promiseList.push(setRemainingItinerary.call(this));
  persist.call(this); // persist to store any information that was synchronously written.
  return promiseList;
}

CreateItinerary.prototype.getItinerary = function() {
  // always read from file to get the latest!
  try {
    this.itin = JSON.parse(fs.readFileSync(this.trip.tripItinFile(),'utf8'));
  }
  catch(err) {
    // TODO: Consider calling create here directly..
    logger.error(`getItinerary: could not read trip itinerary details from file ${this.trip.tripItinFile()}. ${err.message}. Maybe you forgot to call CreateItinerary.create to create and persist the itinerary?`);
    throw new Error("getItinerary: Could not read itinerary details from file. Maybe you forgot to create the itinerary?");
  }
  try {
    const contents = JSON.parse(fs.readFileSync(this.trip.userInputItinFile(), 'utf8'));
    if(contents) {
      Object.keys(contents).forEach(key => {
        if(!this.itin[key]) {
          throw new Error(`getItinerary: key ${key} is not present in main itinerary file, but is present in user input itinerary file. Possible BUG!`);
        }
        this.itin[key].userInputDetails = contents[key];
      });
    }
  }
  catch(e) {
    if(e.code != 'ENOENT') {
      throw e;
    }
    // if code is ENOENT, it just means that the user_input_itin file is not present, which is ok.
  }
	return this.itin;
}

function setDepartureCityDetails() {
  const results = createCommonItinForEachDay.call(this, [this.departureCity, this.tripData.portOfEntry], this.departureCountry);
  if(this.tripData.startTime) {
    this.itin[results.itinDay].startTime = this.tripData.startTime;
  }
  return results.promise;
}

// For each day, set the weather, activities and stay information. If there is no activity/stay information, keep it blank. Initially, simply use the information available for a city in activities.
function setRemainingItinerary() {
  const cityItin = this.tripData.cityItin;
  const duration = this.tripData.duration;
  const departureCountry = this.tripData.country;
  const promises = []; // array of promises that will execute weather setting.
  cityItin.cities.forEach((city,i) => {
    logger.debug(`setRemainingItinerary: setting itinerary for city ${city}`);
    let numDays = 0;
    let cityNumDays = cityItin.numOfDays[i];
    if(i === 0) cityNumDays -= 1; // we assume the first day would be at the port of entry, so we create the itin for one fewer day.
    // use this city for the number of days user is going to stay in this city
    while(numDays++ != cityNumDays) {
      promises.push(createCommonItinForEachDay.call(this, city, departureCountry).promise);
    }
  });
  return promises;
}

// TODO: As we get closer to the travel day, get realtime forecast, rather than historical forecast.
function setWeatherDetails(itinDate, country, cityList) {
  const self = this;
  let cities = []; // convert into an array because cityList could be a single city or a group of cities (see setDepartureCityDetails).
  cities = cities.concat(cityList);
  const promiseList = [];
  cities.forEach(city => {
    promiseList.push(new Promise(function(fulfil, reject) {
      const wip = new WeatherInfoProvider(country, city, itinDate);
      // Call the function that simply gets data from stored file and does not call a URI to do that. The URI calling will be done by calling trip-info-provider:getWeatherInformation in webhook-post-handler.startPlanningTrip before the itinerary is created.
      wip.getStoredWeather(function(c, weatherDetails) {
      // wip.getWeather(function(c, weatherDetails) {
        if(!weatherDetails) {
          logger.error(`callGetWeather: WeatherInfoProvider.getStoredWeather returned null for weather details`);
          // return reject(new Error(`Could not get weather for city ${city}`));
          // we don't want to reject here because if the caller uses Promise.all, the first reject will short-circuit other requests. So, simply use fulfil and move on.
          return fulfil('did not get weather for city ${city}');
        }
        const weather = {};
        weather.min_temp = weatherDetails.min_temp;
        weather.max_temp = weatherDetails.max_temp;
        weather.chanceofrain = weatherDetails.chanceofrain;
        weather.cloud_cover = weatherDetails.cloud_cover;
        const itin = self.itin[formatDate(itinDate)];
        if(cities.length > 1) { // multiple cities
          if(!itin.weather) {
            itin.weather = [];
          }
          weather.city = city; // this way, if we don't get weather for one city, the formatter will know which city's weather has been recorded. see calendar-view/app/formatter.js
          itin.weather.push(weather);
        }
        else {
          itin.weather = weather;
        }
        persist.call(self); // we call persist here so that the itinerary gets updated incrementally. That way, even if there is no information for one city, we will have part of the itinerary.
        return fulfil("success");
      });
    }));
  });
  return promiseList;
}

/*
 Set the city, weather and any other common itinerary items for each day. 
 Return a promise (among other things) of setting weather details 
 As a side-effect of calling this function, this.nextDay is advanced to the next day.
*/
function createCommonItinForEachDay(cityList, country) {
  const nextDayStr = formatDate(this.nextDay);
  logger.debug(`createSingleDayItinerary: Setting itin value for day ${nextDayStr}`);
  if(this.itin[nextDayStr]) {
    // Possible bug
    throw new Error(`createCommonItinForEachDay: Possible BUG! Itinerary for ${nextDayStr} should not be defined, but it is. Value is ${JSON.stringify(this.itin[nextDayStr])}`);
  }
  this.itin[nextDayStr] = {};
  this.itin[nextDayStr].city = cityList;
  if(this.tripData.arrivalDate && this.tripData.arrivalTime) {
    const arrivalDate = formatDate(new Date(this.tripData.arrivalDate));
    if(arrivalDate === nextDayStr) {
      logger.debug(`createCommonItinForEachDay: setting arrival time ${this.tripData.arrivalTime} for day ${nextDayStr}`);
      this.itin[nextDayStr].arrivalTime = this.tripData.arrivalTime;
    }
  }
  if(this.tripData.returnDate && this.tripData.departureTime) {
    const departureDate = formatDate(new Date(this.tripData.returnDate));
    if(departureDate === nextDayStr) {
      logger.debug(`createCommonItinForEachDay: setting departure time ${this.tripData.departureTime} for day ${nextDayStr}`);
      this.itin[nextDayStr].departureTime = this.tripData.departureTime;
    }
  }
  const nextDayCopy = new Date(this.nextDay); // copy the state of nextDay into another variable so we can change this.nextDay without having to worry about any side effects.
  const promiseList = setWeatherDetails.call(this, nextDayCopy, country, cityList);
  this.nextDay.setDate(this.nextDay.getDate() + 1); // advance to the next day only if all the itinerary details for today were set correctly.
  return {
    'itinDay': nextDayStr,
    'promise': promiseList
  };
}

function persist() {
  const file = this.trip.tripItinFile();
  const itinStr = JSON.stringify(this.itin);
  try {
    fs.writeFileSync(file, itinStr);
  }
  catch(err) {
    logger.error(`Error writing to file ${file}: ${err}`);
    return;
  }
}

module.exports = CreateItinerary;
