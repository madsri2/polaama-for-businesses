'use strict';
const fs = require('fs');
const Promise = require('promise');

const baseDir = "/home/ec2-user";
const Country = require(`${baseDir}/country`);
const logger = require(`${baseDir}/my-logger`);
const WeatherInfoProvider = require(`${baseDir}/weather-info-provider`);

function CreateItinerary(trip, departureCity) {
  this.trip = trip;
  this.tripData = trip.data;
  this.tripName = trip.data.name;
  this.departureCity = departureCity;
	this.country = new Country();
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
  // nextDay represents the day for which the itinerary needs to be set. Starts with startDate.
  if(!this.tripData.startDate) {
    throw new Error(`CreateItinerary: startDate not defined in tripData. Nothing to do!`);
  }
  this.nextDay = new Date(this.tripData.startDate);
  const promiseList = [];
  promiseList.push(setDepartureCityDetails.call(this));
  promiseList.push(setRemainingItinerary.call(this));
	const lastDayPromise = setLastDayDetails.call(this);
	if(lastDayPromise) promiseList.push(lastDayPromise);
  persist.call(this); // persist to store any information that was synchronously written.
  return promiseList;
}

function setLastDayDetails() {
	if(!this.trip.returnFlightItin) return null;
	const firstLeg = this.trip.returnFlightItin[0];
	const city = firstLeg.departure_airport.city;
	const lastDay = new Date(this.tripData.returnDate);
	const lastDayStr = formatDate(lastDay);
	if(this.itin[lastDayStr]) throw new Error(`setLastDayDetails: last days' itin already set with value: ${this.itin[dayStr]}`);
	this.itin[lastDayStr] = {};
	this.itin[lastDayStr].city = city;
	// for departure time, we only care about the first leg of the flight
	const depDate = new Date(firstLeg.flight_schedule.departure_time);
	this.itin[lastDayStr].startTime = getTime(depDate);
	// for arrival time, we only care about the last leg of the flight.
	const lastLeg = this.trip.returnFlightItin[this.trip.flightItin.length - 1];
	const arrivalDate = new Date(lastLeg.flight_schedule.arrival_time);
	this.itin[lastDayStr].arrivalTime = getTime(arrivalDate);
	logger.debug(`setDepartureCityDetails: flightItin present. departure date is ${depDate}; arrival date is ${arrivalDate}`);
	// returns a promise list
	const country = this.country.getCountry(city);
  return setWeatherDetails.call(this, lastDay, country, city);
}

CreateItinerary.prototype.getItinerary = function() {
  // always read from file to get the latest!
  const file = this.trip.tripItinFile();
  try {
    this.itin = JSON.parse(fs.readFileSync(file,'utf8'));
  }
  catch(err) {
    // TODO: Consider calling create here directly..
    logger.error(`getItinerary: could not read trip itinerary details from file ${file}. ${err.message}. Maybe you forgot to call CreateItinerary.create to create and persist the itinerary?`);
    throw new Error(`getItinerary: Could not read itinerary details from file ${file}. Maybe you forgot to create the itinerary?`);
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
	const nextDayStr = results.itinDay;
  logger.debug(`setDepartureCityDetails: setting itinerary for first day: Departure city: ${this.departureCity}; port of entry: ${this.tripData.portOfEntry}`);
	if(this.trip.flightItin) {
		// for departure time, we only care about the first leg of the flight
		const firstLeg = this.trip.flightItin[0];
		const depDate = new Date(firstLeg.flight_schedule.departure_time);
		if(formatDate(depDate) === nextDayStr) this.itin[nextDayStr].startTime = getTime(depDate);
		// for arrival time, we only care about the last leg of the flight.
		const lastLeg = this.trip.flightItin[this.trip.flightItin.length - 1];
		const arrivalDate = new Date(lastLeg.flight_schedule.arrival_time);
		if(formatDate(arrivalDate) === nextDayStr) this.itin[nextDayStr].arrivalTime = getTime(arrivalDate);
		logger.debug(`setDepartureCityDetails: flightItin present. departure date is ${depDate}; arrival date is ${arrivalDate}`);
	}
	else logger.debug(`setDepartureCityDetails: this.trip.flightItin not present. Not setting flight details`);
  return results.promise;
}

// For each day, set the weather, activities and stay information. If there is no activity/stay information, keep it blank. Initially, simply use the information available for a city in activities.
function setRemainingItinerary() {
	const promises = []; // array of promises that will execute weather setting.
	if(!this.tripData.cityItin) {
		logger.warn(`setRemainingItinerary: cityItin not defined in tripData. Nothing to do!`);
		return promises;
	}
  const cityItin = this.tripData.cityItin;
  const duration = this.tripData.duration;
  const departureCountry = this.tripData.country;
  cityItin.cities.forEach((city,i) => {
    logger.debug(`setRemainingItinerary: setting itinerary for city ${city}`);
    let numDays = 0;
    let cityNumDays = cityItin.numOfDays[i];
    if(i === 0) cityNumDays -= 1; // we assume the first day would be at the port of entry, so we create the itin for one fewer day.
    // use this city for the number of days user is going to stay in this city
    while(numDays++ != cityNumDays) {
			if(formatDate(this.nextDay) === formatDate(new Date(this.tripData.returnDate))) {
				logger.info(`setRemainingItinerary: Not setting itin for last day: ${this.tripData.returnDate}. will be set by setLastDayDetails method`);
				return;
			}
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

function getTime(date) {
	if(!date) return null;
	const m = date.getMinutes();
	const h = date.getHours();
	return (m > 9 ? `${h}:${m}` : `${h}:0${m}`);
}

/*
 Set the city, weather and any other common itinerary items for each day. 
 Return a promise (among other things) of setting weather details 
 As a side-effect of calling this function, this.nextDay is advanced to the next day.
*/
function createCommonItinForEachDay(cityList, country) {
  const nextDayStr = formatDate(this.nextDay);
  if(this.itin[nextDayStr]) {
    // Possible bug
    throw new Error(`createCommonItinForEachDay: Possible BUG! Itinerary for ${nextDayStr} should not be defined, but it is. Value is ${JSON.stringify(this.itin[nextDayStr])}`);
  }
  this.itin[nextDayStr] = {};
  this.itin[nextDayStr].city = cityList;
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
    // logger.debug(`persist: Called persist. About to write ${itinStr.length} to file ${file}`);
    fs.writeFileSync(file, itinStr);
  }
  catch(err) {
    logger.error(`Error writing to file ${file}: ${err}`);
    return;
  }
}

module.exports = CreateItinerary;
