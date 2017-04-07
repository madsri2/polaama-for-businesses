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
  promiseList.push(setItinForPortOfEntry.call(this));
  promiseList.push(setRemainingItinerary.call(this));
  promiseList.push(setItinForPortOfDeparture.call(this));
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


function setItinForPortOfEntry() {
  if(!this.tripData.portOfEntry) {
    throw new Error(`setItinForPortOfEntry: port of entry not defined in trip`);
  }
  const promises = [];
  const city = this.tripData.portOfEntry;
  // promises.push((createCommonItinForEachDay.call(this, city, this.tripData.country)).promise);
  if(!this.tripData.cityItin[city]) {
    throw new Error(`setItinForPortOfEntry: Don't have information about number of days of stay in port of entry city ${city}`);
  }
  // divide the number of days in portOfEntry equally between beginning of trip and end of trip
  const numDays = Math.ceil(parseInt(this.tripData.cityItin[city]) / 2) - 1; // substract one because we have already added port of itinerary to the first day along with departure city in setDepartureCityDetails
  for(let i = 0; i < numDays; i++) {
    promises.push((createCommonItinForEachDay.call(this, city, this.tripData.country)).promise);
  }
  return promises;
}

// For each day, set the weather, activities and stay information. If there is no activity/stay information, keep it blank. Initially, simply use the information available for a city in activities.
function setRemainingItinerary() {
  const cityItin = this.tripData.cityItin;
  const duration = this.tripData.duration;
  const departureCountry = this.tripData.country;
  const promises = []; // array of promises that will execute weather setting.
  Object.keys(cityItin).forEach(city => {
    // port of entry is special case. So, skip it.
    if(city === this.tripData.portOfEntry) {
      return;
    }
    let numDays = 0;
    // use this city for the number of days user is going to stay in this city
    while(numDays++ != cityItin[city]) {
      promises.push(createCommonItinForEachDay.call(this, city, departureCountry).promise);
    }
  });
  return promises;
}

function setItinForPortOfDeparture() {
  const city = this.tripData.portOfEntry;
  if(!this.tripData.cityItin[city]) {
    throw new Error(`setItinForPortOfDeparture: port of entry ${city} does not have any details in trips's itinerary`);
  }
  // divide the number of days in portOfEntry equally between beginning of trip and end of trip
  const numDays = Math.ceil(parseInt(this.tripData.cityItin[city]) / 2);
  const remainingDays = this.tripData.cityItin[city] - numDays;
  const promises = [];
  let result = null;
  for(let i = 0; i < remainingDays; i++) {
    result = createCommonItinForEachDay.call(this, city, this.tripData.country);
    logger.debug(`result is ${JSON.stringify(result)}`);
    promises.push(result.promise);
  }
  // TODO: Verify that the departure date matches nextDay!
  if(this.tripData.departureTime) {
    logger.debug(`setting departure time for day ${result.itinDay}`);
    this.itin[result.itinDay].departureTime = this.tripData.departureTime;
  }
  return promises;
}

// TODO: As we get closer to the travel day, get realtime forecast, rather than historical forecast.
function setWeatherDetails(itinDate, country, cityList) {
  const itin = this.itin[formatDate(itinDate)];
  const self = this;
  let cities = []; // convert into an array because cityList could be a single city or a group of cities (see setDepartureCityDetails).
  cities = cities.concat(cityList);
  const promiseList = [];
  cities.forEach(city => {
    promiseList.push(new Promise(function(fulfil, reject) {
      const wip = new WeatherInfoProvider(country, city, itinDate);
      wip.getWeather(function(c, weatherDetails) {
        if(!weatherDetails) {
          logger.error(`callGetWeather: WeatherInfoProvider.getWeather returned null for weather details`);
          return reject(new Error(`Could not get weather for city ${city}`));
        }
        const weather = {};
        weather.min_temp = weatherDetails.min_temp;
        weather.max_temp = weatherDetails.max_temp;
        weather.chanceofrain = weatherDetails.chanceofrain;
        weather.cloud_cover = weatherDetails.cloud_cover;
        if(cities.length > 1) { // multiple cities
          if(!itin.weather) {
            itin.weather = [];
          }
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
    throw new Error(`createSingleDayCommonItinerary: Possible BUG! Itinerary for ${nextDayStr} should not be defined, but it is. Value is ${JSON.stringify(this.itin[nextDayStr])}`);
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
    // console.log(`Itin is ${JSON.stringify(this.itin, null, 2)}`);
    fs.writeFileSync(file, itinStr);
  }
  catch(err) {
    logger.error(`Error writing to file ${file}: ${err}`);
    return;
  }
  logger.debug(`persist: Wrote ${itinStr.length} bytes to file ${file}`);
}

/*
const details = {
  india: {
    cities: {
      seattle: {
        leave: "09:00",
        weather: {
          temp: 54,
          rain_chance: "80%",
          weather: "rainy"
        }
      },
      chennai: {
        weather: {
          temp: 87,
          rain_chance: "36%",
          weather: "mostly sunny"
        },
        'arrival': "10:00",
        'return': "22:00",
        'visit': ["Pulicat Lake", "Marina Beach", "Mamallapuram"]
      },
      mumbai: {
        weather: {
          temp: 90,
          rain_chance: "3%",
          weather: "mostly sunny"
        },
        'visit': ["Elephanta caves", "Juhu Beach"]
      },
      goa: {
        weather: {
          temp: 75,
          rain_chance: "0%",
          weather: "sunny"
        },
        'visit': ["Dudhsagar falls", "Beach", "Mandovi River Cruise"]
      },
      bengaluru: {
        weather: {
          temp: 72,
          rain_chance: "0%",
          weather: "partly cloudy"
        },
        'visit': ["Lalbagh Park", "Ulsoor Lake", "National flight museum"]
      }
    }
  }
};

// {"3":{"name":"lisbon","temp": 70, "rain_chance": "36%", "weather": "sunny", "arrival": "10.00", "hotel": "Taj", "visit":["Torres De Bellem"], "itin": []},"4": {"name": "lisbon", "temp": 70, "weather": "partly cloudy", "rain_chance": "40%", "itin":[]}, "5": {"name": "sintra", "temp": 65, "rain_chance": "20%", "weather": "partly cloudy"}, "6": {"name": "sintra", "temp": 65, "rain_chance": "65%"}, "7": {}, "8": {}, "9": {}, "10": {}, "11": {}, "12": {}, "13": {"leave": "15:00"}, "14": {}} 
CreateItinerary.prototype.oldCreate = function() {
  const tripData = this.trip.data;

  // assign the first two days to portOfEntry.
  createItinForFirstThreeDays.call(this, new Date(tripData.startDate), tripData.portOfEntry);

  // Split the remaining days equally among other cities.
  const remainingTime = tripData.duration - 5;
  let ci = 0;
  const cities = tripData.cities;
  const numCities = cities.length - 1; // port of entry is present here.
  const daysPerCity = parseInt(remainingTime / numCities);
  const sDate = new Date(tripData.startDate);
  sDate.setDate(sDate.getDate() + 3);
  const thirdDay = sDate.getDate();
  const rDate = new Date(tripData.returnDate);
  rDate.setDate(rDate.getDate() - 2);
  const twoDaysBeforeLeaving = rDate.getDate();
  console.log(`startDay: ${tripData.startDate}; thirdDay: ${thirdDay}; last: ${twoDaysBeforeLeaving}; returnDate: ${tripData.returnDate}; daysPerCity: ${daysPerCity}; duration: ${tripData.duration}`);
  for(let i = thirdDay; i <= twoDaysBeforeLeaving; i++) {
    if(cities[ci] === tripData.portOfEntry) {
      ci++;
    }
    if(Object.keys(this.itin).length === tripData.duration) {
      break;
    }
    for(let j = 0; j < daysPerCity; j++) {
      if(Object.keys(this.itin).length === tripData.duration) {
        break;
      }
      console.log(`Adding ${cities[ci]} for day ${i+j}`);
      this.itin[i+j] = {};
      this.itin[i+j].name = cities[ci];
      getWeather.call(this, i+j, cities[ci]);
      if(!this.itin[i+j].visit) {
        this.itin[i+j].visit = [];
      }
      this.itin[i+j].visit.push(details[this.tripName].cities[cities[ci]].visit[j]);
    }
    if(ci < (cities.length - 1)) {
      ci++;
    }
  }

  // assign the last two days to portofEntry (assuming this is also the portOfExit)
  createItinForLastTwoDays.call(this, new Date(tripData.returnDate), tripData.portOfEntry);

  persist.call(this);
}

function createItinForFirstThreeDays(startDate, city) {
  const origin = "seattle";
  const day = startDate.getDate();
  this.itin[day] = {};
  this.itin[day].name = origin;
  getWeather.call(this, day, origin);
  this.itin[day].leave = details[this.tripName].cities[origin].leave;

  // next day
  const nDate = new Date(startDate.toString());
  nDate.setDate(startDate.getDate() + 1);
  const nextDay = nDate.getDate();
  this.itin[nextDay] = {};
  this.itin[nextDay].name = city;
  getWeather.call(this, nextDay, city);
  this.itin[nextDay].arrival = details[this.tripName].cities[city].arrival;


  // day after
  nDate.setDate(startDate.getDate() + 2);
  const dayAfter = nDate.getDate();
  this.itin[dayAfter] = {};
  this.itin[dayAfter].name = city;
  getWeather.call(this, dayAfter, city);
  this.itin[dayAfter].visit = [];
  this.itin[dayAfter].visit.push(details[this.tripName].cities[city].visit[0]);
}

function createItinForLastTwoDays(returnDate, city) {
  const day = returnDate.getDate();
  this.itin[day] = {};
  this.itin[day].name = city;
  getWeather.call(this, day, city);
  this.itin[day].visit = [];
  this.itin[day].visit.push(details[this.tripName].cities[city].visit[1]);

  const pDate = new Date(returnDate.toString());
  pDate.setDate(returnDate.getDate() - 1);
  const prevDay = pDate.getDate();
  this.itin[prevDay] = {};
  this.itin[prevDay].name = city;
  getWeather.call(this, prevDay, city);
  this.itin[day].return = details[this.tripName].cities[city].return;
}

function getWeather(day) {
  const city = this.itin[day].name;
  this.itin[day].temp = details[this.tripName].cities[city].weather.temp;
  this.itin[day].rain_chance = details[this.tripName].cities[city].weather.rain_chance;
  this.itin[day].weather = details[this.tripName].cities[city].weather.weather;
}
*/

module.exports = CreateItinerary;
