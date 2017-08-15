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
  if(!this.tripData.startDate) throw new Error(`CreateItinerary: startDate not defined in tripData. Nothing to do!`);
  this.nextDay = new Date(this.tripData.startDate);
  const promiseList = [];
  promiseList.push(setFirstDayDetails.call(this));
  promiseList.push(setRemainingItinerary.call(this));
  const lastDayPromises = setLastDayDetails.call(this);
  if(lastDayPromises && lastDayPromises.length > 0) promiseList.push(lastDayPromises);
  persist.call(this); // persist to store any information that was synchronously written.
  return promiseList;
}

function setLastDayDetails() {
  const promiseList = [];
  if(!this.tripData.returnDate) throw new Error(`setLastDayDetails: Do not know return date for trip ${this.tripData.rawName}`);
  const lastDay = new Date(this.tripData.returnDate);
  const lastDayStr = formatDate(lastDay);
  if(this.itin[lastDayStr]) throw new Error(`setLastDayDetails: last days' itin already set with value: ${this.itin[dayStr]}`);
  this.itin[lastDayStr] = {};
  let city;
  let firstLeg;
  if(!this.trip.returnFlightItin) {
    if(this.tripData.cityItin) {
      const cities = this.tripData.cityItin.cities;
      // logger.debug(`setLastDayDetails: cities: ${cities}`);
    // if the trip has a city list, the city for the last day would be the last city in the list. Otherwise, it is the city that we are traveling to.
      city = cities[cities.length - 1];
    }
    else if(!this.tripData.portOfEntry) throw new Error(`setLastDayDetails: trip's cityItin and portOfEntry not set: ${JSON.stringify(this.tripData)}`); 
    else city = this.tripData.portOfEntry;
    // logger.debug(`setLastDayDetails: city value is ${city}. returnFlightItin not present. trip data: ${JSON.stringify(this.tripData)}`);
  }
  else {
    // logger.debug(`setLastDayDetails: returnFlightItin present`);
    firstLeg = this.trip.returnFlightItin[0];
    city = firstLeg.departure_airport.city;
  }
  this.itin[lastDayStr].city = city;
  // logger.debug(`The city for the last day is ${city} and last Day is ${lastDayStr}`);
  promiseList.push(setWeatherDetails.call(this, lastDay, this.country.getCountry(city), city));
  // nothing more to do if there is no return flight itin
  if(!this.trip.returnFlightItin)  return promiseList;
  // for departure time, we only care about the first leg of the flight
  const depDate = new Date(firstLeg.flight_schedule.departure_time);
  this.itin[lastDayStr].startTime = getTime(depDate);
  // for arrival time, we only care about the last leg of the flight.
  const lastLeg = this.trip.returnFlightItin[this.trip.returnFlightItin.length - 1];

  const arrivalDate = new Date(lastLeg.flight_schedule.arrival_time);
  const arrivalDateStr = formatDate(arrivalDate);
  if(arrivalDateStr !== lastDayStr) {
    if(this.itin[arrivalDateStr]) throw new Error(`setLastDayDetails: Did not expect itinerary for day ${arrivalDateStr} but it's present with value: ${JSON.stringify(this.itin[arrivalDateStr])}`);
    const arrivalCity = lastLeg.arrival_airport.city;
    this.itin[arrivalDateStr] = {};
    this.itin[arrivalDateStr].city = arrivalCity;
    promiseList.push(setWeatherDetails.call(this, arrivalDate, this.country.getCountry(arrivalCity), arrivalCity));
  }
  this.itin[arrivalDateStr].arrivalTime = getTime(arrivalDate);
  // logger.debug(`setLastDayDetails: returnFlightItin present. departure date is ${depDate}; arrival date is ${arrivalDate}`);
  return promiseList;
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
        if(key === "title") return;
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

// https://m.uber.com/ul/?action=setPickup&client_id=5cMxoTVfs2ljtAJa8uddnjyYuwQff4sP&pickup=my_location&dropoff[formatted_address]=836%20Harrison%20Avenue%20South%2C%20Salt%20Lake%20City%2C%20UT%2084105%2C%20United%20States&dropoff[latitude]=40.739661&dropoff[longitude]=-111.866892
// https://m.uber.com/ul/?action=setPickup&client_id=5cMxoTVfs2ljtAJa8uddnjyYuwQff4sP&pickup[formatted_address]=SLC%20Airport%2C%20Salt%20Lake%20City%2C%20UT%2C%20United%20States&pickup[latitude]=40.789940&pickup[longitude]=-111.979071&dropoff[formatted_address]=836%20Harrison%20Avenue%20South%2C%20Salt%20Lake%20City%2C%20UT%2C%20United%20States&dropoff[latitude]=40.739661&dropoff[longitude]=-111.866892
// "url": "https://lyft.com/ride/?id=lyft&pickup[latitude]=40.789940&pickup[longitude]=-111.979071&partner=ejwSKO9XD0NZ&destination[latitude]=40.739661&destination[longitude]=-111.866892",
// "url": "https://lyft.com/ride?id=lyft&pickup[latitude]=37.764728&pickup[longitude]=-122.422999&partner=ejwSKO9XD0NZ&destination[latitude]=37.7763592&destination[longitude]=-122.4242038", --> WORKS
function setFirstDayDetails() {
  const results = createCommonItinForEachDay.call(this, [this.departureCity, this.tripData.portOfEntry], this.departureCountry);
  // logger.debug(`setFirstDayDetails: setting itinerary for first day: Departure city: ${this.departureCity}; port of entry: ${this.tripData.portOfEntry}`);
  if(!this.trip.flightItin) {
    // logger.debug(`setFirstDayDetails: this.trip.flightItin not present. No flight details`);
    return results.promise;
  }
  // for departure time, we only care about the first leg of the flight
  const firstLeg = this.trip.flightItin[0];
  const depDate = new Date(firstLeg.flight_schedule.departure_time);
  const depDateStr = formatDate(depDate);
  if(!this.itin[depDateStr]) throw new Error(`setFirstDayDetails: Expected itinerary to contain date ${depDateStr}, which should be the same as ${results.itinDay}, but that is not the case`);
  this.itin[depDateStr].startTime = getTime(depDate);
  logger.debug(`setFirstDayDetails: trip dump: ${JSON.stringify(trip)}`);
  // for arrival time, we only care about the last leg of the flight.
  const lastLeg = this.trip.flightItin[this.trip.flightItin.length - 1];
  const arrivalDate = new Date(lastLeg.flight_schedule.arrival_time);
  const arrivalDateStr = formatDate(arrivalDate);
  if(!this.itin[arrivalDateStr]) {
    const city = lastLeg.arrival_airport.city;
    this.itin[arrivalDateStr] = {};
    this.itin[arrivalDateStr].city = city;
    // we don't set weather details or any other common itinerary details because that will be taken care of by createCommonItinForEachDay, which will be called as part of setRemainingDay for this day.
  }
  this.itin[arrivalDateStr].arrivalTime = getTime(arrivalDate);
  // logger.debug(`setFirstDayDetails: flightItin present. departure date is ${depDate}; arrival date is ${arrivalDate}`);
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
    // logger.debug(`setRemainingItinerary: setting itinerary for city ${city}`);
    let numDays = 0;
    let cityNumDays = cityItin.numOfDays[i];
    if(i === 0) cityNumDays -= 1; // we assume the first day would be at the port of entry, so we create the itin for one fewer day.
    // use this city for the number of days user is going to stay in this city
    while(numDays++ != cityNumDays) {
      if(formatDate(this.nextDay) === formatDate(new Date(this.tripData.returnDate))) {
        // logger.info(`setRemainingItinerary: Not setting itin for last day: ${this.tripData.returnDate}. will be set by setLastDayDetails method`);
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
  let cities = []; // convert into an array because cityList could be a single city or a group of cities (see setFirstDayDetails).
  cities = cities.concat(cityList);
  const promiseList = [];
  cities.forEach(city => {
    promiseList.push(new Promise(function(fulfil, reject) {
      const wip = new WeatherInfoProvider(country, city, itinDate);
      // Call the function that simply gets data from stored file and does not call a URI to do that. The URI calling will be done by calling trip-info-provider:getWeatherInformation in webhook-post-handler.startPlanningTrip before the itinerary is created.
      wip.getStoredWeather(function(c, weatherDetails) {
      // wip.getWeather(function(c, weatherDetails) {
        if(!weatherDetails) {
          // logger.error(`callGetWeather: WeatherInfoProvider.getStoredWeather returned null for weather details`);
          // return reject(new Error(`Could not get weather for city ${city}`));
          // we don't want to reject here because if the caller uses Promise.all, the first reject will short-circuit other requests. So, simply use fulfil and move on.
          return fulfil('did not get weather for city ${city}');
        }
        const weather = {};
        weather.min_temp = weatherDetails.min_temp;
        weather.max_temp = weatherDetails.max_temp;
        weather.chanceofrain = weatherDetails.chanceofrain;
        weather.cloud_cover = weatherDetails.cloud_cover;
        weather.city = city; // always set the city associated with this weather
        const itin = self.itin[formatDate(itinDate)];
        if(cities.length > 1) { // multiple cities
          if(!itin.weather) {
            itin.weather = [];
          }
          // weather.city = city; // this way, if we don't get weather for one city, the formatter will know which city's weather has been recorded. see calendar-view/app/formatter.js
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
  if(this.itin[nextDayStr] && nextDayStr !== formatDate(new Date(new Date(this.tripData.startDate).getDate() + 1))) {
    const startDate = new Date(this.tripData.startDate);
    startDate.setDate(startDate.getDate() + 1);
    // it is possible for the day after start day to have an itinerary defined (see setFirstDayDetails, but throw error for anything else.
    if(nextDayStr !== formatDate(startDate)) throw new Error(`createCommonItinForEachDay: Possible BUG! Itinerary for ${nextDayStr} should not be defined, but it is. Value is ${JSON.stringify(this.itin[nextDayStr])}`);
  }
  else {
    this.itin[nextDayStr] = {};
    this.itin[nextDayStr].city = cityList;
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
    // logger.debug(`persist: Called persist. About to write ${itinStr.length} to file ${file}`);
    fs.writeFileSync(file, itinStr);
  }
  catch(err) {
    logger.error(`Error writing to file ${file}: ${err}`);
    return;
  }
}

module.exports = CreateItinerary;
