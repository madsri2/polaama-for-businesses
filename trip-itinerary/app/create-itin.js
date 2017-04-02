'use strict';
const logger = require('../../my-logger');
const fs = require('fs');
const WeatherInfoProvider = require('../../weather-info-provider');
const Promise = require('promise');

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

function CreateItinerary(trip) {
  this.trip = trip;
  this.tripData = trip.data;
  this.tripName = trip.data.name;
  this.itin = {};
}  

CreateItinerary.prototype.create = function() {
  // console.log(`trip details for ${this.tripName} is ${JSON.stringify(this.trip)}`);
	return setTripDetails.call(this);
}

CreateItinerary.prototype.getDetails = function() {
	return this.tripDetails;
}

// From the list of cities the user is traveling to and the 
function setTripDetails() {
}

function setDepartureCityDetails() {
	const countryDetails = this.tripDetails[this.destinationCountry];
	// TODO: This needs to be set in webhook-post-handler.js (before calling startPlanningTrip).
	const departureCity = this.tripData.departureCity; 
	countryDetails[departureCity] = {};
	const cityDetails = countryDetails[departureCity];
	if(this.tripData.departureTime) {
		cityDetails.departureTime = this.tripData.departureTime;
	}
  // setWeatherDetails makes an asynchronous call to get weather information.
  return Promise.denodeify(setWeatherDetails.bind(this));
}

// TODO: As we get closer to the travel day, get realtime forecast, rather than historical forecast.
function setWeatherDetails(callback) {
  const startDate = this.tripData.startDate;
  const departureCountry = this.tripData.departureCountry;
  const departureCity = this.tripData.departureCity; 
	const countryDetails = this.tripDetails[this.destinationCountry];
  const cityDetails = countryDetails[departureCity];
  const wip = new WeatherInfoProvider(departureCountry, departureCity, startDate);
  wip.getWeather(function(c, weatherDetails) {
    if(!weatherDetails) {
      logger.error(`callGetWeather: WeatherInfoProvider.getWeather returned null for weather details`);
      return callback();
    }
    cityDetails.weather = {};
    cityDetails.weather.min_temp = weatherDetails.min_temp;
    cityDetails.weather.max_temp = weatherDetails.max_temp;
    cityDetails.weather.chanceofrain = weatherDetails.chanceofrain;
    cityDetails.weather.cloud_cover = weatherDetails.cloud_cover;
    return callback();
  });
}

// First day of travel would be port of entry. After that, determine stay in each city by the number of activities in each city, how long it will take etc.
function setCityForEachDay() {
  const cities = this.tripData.cities;
  // remove portOfEntry from cities list
  // port of entry would be day1 and last day.
  const tripTime = this.tripData.returnDate - this.tripData.startDate;
}

// For each day, set the weather, activities and stay information. If there is no activity/stay information, keep it blank. Initially, simply use the information available for a city in activities.
function setRemainingItinerary() {
  const startDay=this.tripData.startDate.getDate();
  setCityForEachDay.call(this);
  tripDays.forEach(day => {
    
  });
}

function setTripDetails() {
	this.tripDetails = {};
	this.destinationCountry = this.tripData.country;
	this.tripDetails[this.destinationCountry] = {};
  const promiseList = [];
  promiseList.push(setDepartureCityDetails.call(this));
  setRemainingItinerary.call(this);
}

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

function persist() {
  const file = this.trip.tripItinFile();
  try {
    // console.log(`Itin is ${JSON.stringify(this.itin, null, 2)}`);
    fs.writeFileSync(file, JSON.stringify(this.itin));
  }
  catch(err) {
    logger.error(`Error writing to file ${file}: ${err}`);
    return;
  }
  logger.info(`persist: Wrote ${((this.itin).toString()).length} bytes to file ${file}`);
}

module.exports = CreateItinerary;
