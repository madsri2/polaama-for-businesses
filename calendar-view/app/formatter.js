'use strict';

const logger = require('../../my-logger');
const fs = require('fs');
const CreateItinerary = require('../../trip-itinerary/app/create-itin'); // TODO: This relative path is ridiculous. Fix me

const alphabet = ['a','b','c','d','e','f','g'];
const dayString = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const htmlBaseDir = "/home/ec2-user/html-templates"; // TODO: Move this to config.


// This class gets data from trips/portugal-itinerary.txt and creates a calendar view from that information.

function FormatCalendar(trip, hometown) {
  this.trip = trip;
  this.tripData = this.trip.data;
  this.tripName = this.trip.rawTripName;
  this.hometown = hometown;
  fetchItinerary.call(this);
  this.html = "";
}

FormatCalendar.prototype.format = function() {
  this.html = fetchCalView.call(this);
  const calHtml = formatView.call(this, this.tripData.startDate);
  const month = monthNames[this.startDate.getMonth()];
  const year = this.startDate.getFullYear();
  return this.html
    .replace("${month}", month)
    .replace("${year}", year)
    .replace("${calendar}", calHtml);
}

FormatCalendar.prototype.formatForMobile = function() {
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  try {
    const html = fs.readFileSync(`${htmlBaseDir}/mobile-itinerary-view.html`, 'utf8');
    logger.debug(`formatForMobile: There are ${Object.keys(this.itinDetails).length} days in itinerary`);
    let itinView = "";
    let fullJs = "";
    Object.keys(this.itinDetails).forEach(day => {
      const thisDate = new Date(day);
      const month = thisDate.getMonth() + 1; // getMonth() starts with 0
      // convert "/" to "-" because this id will be used in javascript and a value like "#update-11/01/2017" will result in a syntax error
      const dateVal = CreateItinerary.formatDate(thisDate).split('/').join('-');
      itinView = itinView.concat(dayItin({
        "${dayOfMonth}": thisDate.getDate(),
        "${day}": weekDays[thisDate.getDay()],
        "${dateVal}": dateVal,
        "${monthName}": monthNames[thisDate.getMonth()],
        "${existingItinerary}": getThisDaysItin.call(this, thisDate)
      }));
      fullJs = fullJs.concat(getJavascript(dateVal));
    });
    return html.replace("${itinerary}", itinView)
               .replace("${javascript}", fullJs);
  }
  catch(err) {
    logger.error(`formatForMobile: Error formatting itinerary: ${err.stack}`);
    throw err;
  }
}

function dayItin(search) {
  try {
    let xformedString = fs.readFileSync(`${htmlBaseDir}/day-itinerary-view.html`, 'utf8');
    Object.keys(search).forEach(key => {
      xformedString = xformedString.split(key).join(search[key]);
    });
    return xformedString;
  }
  catch(e) {
    throw e;
  }
}

function setWeatherContents(details) {
  let contents = "";
  const weather = details.weather;
  if(!weather) {
    return contents;
  }
  if(!Array.isArray(weather)) {
    contents += `<li>Avg min temp: ${weather.min_temp}&degF; Max temp: ${weather.max_temp}&degF</li>`;
    contents += `<li>Chance of rain: ${weather.chanceofrain}%; It will be ${weather.cloud_cover} today.</li>`;
    return contents;
  }
  // we have been sent an array of weather. That means there are multiple cities on the same day in the itinerary.
  weather.forEach(cityWeather => {
    contents += `<li>Average min temp at ${cityWeather.city}: ${cityWeather.min_temp}&degF; Max temp: ${cityWeather.max_temp}&degF</li>`;
    contents += `<li>Chance of rain: ${cityWeather.chanceofrain}%; It will be ${cityWeather.cloud_cover} today.</li>`;
  });
  return contents;
}

function getThisDaysItin(date) {
  const thisDateStr = CreateItinerary.formatDate(date);
  logger.debug(`getThisDaysItin: getting itinerary for day ${thisDateStr}`);
  const details = this.itinDetails[thisDateStr];
  let contents = "";
  let departureCity;
  if(details.city) {
    if(Array.isArray(details.city)) {
      let cityStr = "";
      details.city.forEach((city,index) => {
        cityStr += capitalize1stChar(city);
        if(index != (details.city.length - 1)) cityStr += "/";
      });
      contents = `<li><b>${cityStr}</b></li>`;  
      departureCity = details.city[0];
    }
    else {
      contents = `<li><b>${capitalize1stChar(details.city)}</b></li>`;
      departureCity = details.city;
    }
  }
  contents += setWeatherContents.call(this, details);
  if(details.startTime) {
    contents += `<li>Leaving ${capitalize1stChar(departureCity)} at ${details.startTime}.</li>`;
  }
  // returning from trip
  if(details.departureTime) {
    contents += `<li>Leaving ${capitalize1stChar(departureCity)} at ${details.departureTime}.</li>`;
  }
  if(details.arrivalTime) {
    contents += `<li>Reach ${capitalize1stChar(details.city)} at ${details.arrivalTime}.</li>`;
  }
  if(details.visit) {
    const visiting = details.visit;
    visiting.forEach(i => {
      contents += `<li>Visit ${i}. Get <a href="https://www.google.com/maps/search/${encodeURIComponent(i)}">directions</a></li>`;
    });
  }
  if(details.userInputDetails) {
    details.userInputDetails.forEach(userInput => {
      contents += `<li>${userInput}</li>`;
    });
  }
  return contents;
}

function getJavascript(dateVal) {
  let js = `
    $("#update-${dateVal}", e.target ).on( "click", function( e ) { 
      $("#hidden-form-${dateVal}").removeClass("ui-screen-hidden"); 
      $("#list-${dateVal}").listview("refresh"); 
    }); 
    $("#itin-submit-${dateVal}", e.target).on("submit", function(e) { 
      e.preventDefault(); //cancel the submission 
      show("${dateVal}"); //send the request to server to save it 
    }); 
  `;
  return js; 
}

// Find out the day based on the date of travel. Create the month view from that.
function formatView(startDate) {
  this.startDate = new Date(this.tripData.startDate);
  this.returnDate = new Date(this.tripData.returnDate);
  // const prevSunday = getPreviousSunday.call(this);
  let date = new Date(this.startDate.toString());
  let firstDay = date.getDay();
  let calHtml = "";
  for(let i = 0; i < firstDay; i++) {
      calHtml += `<div class="ui-block-${alphabet[i]}"><div class="ui-bar ui-bar-a" style="height:100px"></div></div>`;
  }
  do {
    for(let i = firstDay; i < 7; i++) {
      // console.log(`date is ${date}; i's value is ${i}; alphabet is ${alphabet[i]}`);
      calHtml += `<div class="ui-block-${alphabet[i]}"><div class="ui-bar ui-bar-a" style="height:100px">`;
      calHtml += `<p style="color:FireBrick;">${date.getDate()}</p>`;
      const popupContent = getPopupContents.call(this, date.getDate());
      if(popupContent) {
        calHtml += popupContent;
      }
      calHtml += `</div></div>`;
      // console.log(`current date: ${date.toString()}; startDate: ${this.startDate.toString()}; returnDate: ${this.returnDate.toString()}`);
      if(date.toString() === this.returnDate.toString()) {
        break;
      }
      date.setDate(date.getDate() + 1);
    }
    // always start with Sunday
    firstDay = 0; 
  } while(date.toString() != this.returnDate.toString());
  return calHtml;
}

function getPreviousSunday() {
  const startDay = this.startDate.getDay();
  const previousSunday = new Date();
  previousSunday.setDate(date.getDate() - startDay);
  return previousSunday;
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

// return weather information, stay details and activities.
function getPopupContents(day) {
  logger.debug(`getPopupContents: Getting details for ${day}`);
  const cityDetails = this.itinDetails[day];
  if(!cityDetails || Object.keys(cityDetails).length == 0 || !cityDetails.name) {
    logger.info(`getPopupContents: No details present for day ${day}`);
    return "";
  }
  const popupId = `${cityDetails.name}-${day}`;
  let contents = `<a href="#${popupId}" data-rel="popup" data-transition="pop" class="ui-btn ui-corner-all ui-btn-inline ui-mini ui-shadow" title="Plan Details">${capitalize1stChar(cityDetails.name)}</a>`;
  contents += `<div data-role="popup" id="${popupId}" class="ui-content" data-theme="a" style="max-width:350px;" data-arrow="true">`;
  if(cityDetails.temp) {
    contents += `<p>Average Temperature is ${cityDetails.temp}&degF</p>`;
  }
  if(cityDetails.rain_chance) {
    contents += `<p>Chance of rain is ${cityDetails.rain_chance}</p>`;
  }
  if(cityDetails.weather) {
    contents += `<p>It will be ${cityDetails.weather} today.</p>`;
  }
  // returning from trip
  if(cityDetails.return) {
    contents += `<p>Leaving ${capitalize1stChar(cityDetails.name)} at ${cityDetails.return}.</p>`;
  }
  if(cityDetails.arrival) {
    contents += `<p>Arrive in ${capitalize1stChar(cityDetails.name)} at ${cityDetails.arrival}.</p>`;
  }
  // leaving portOfOrigin
  if(cityDetails.leave) {
    contents += `<p>Leave ${capitalize1stChar(cityDetails.name)} at ${cityDetails.leave}.</p>`;
  }
  if(cityDetails.visit) {
    const visiting = cityDetails.visit;
    visiting.forEach(i => {
      contents += `<p>Visit ${i}. Get <a href="https://www.google.com/maps/search/${encodeURIComponent(i)}">directions</a>`;
    });
  }
  if(!cityDetails.itin) {
    contents += `</div>`;
    return contents;
  }
  cityDetails.itin.forEach(item => {
    contents += `<p>${item}</p>`;
  });
  contents += `</div>`;
  return contents;
}

function fetchCalView() {
  const html = `${htmlBaseDir}/trip-calendar-view.html`;
  try {
    return fs.readFileSync(html, 'utf8');
  }
  catch(err) {
    logger.info(`could not read html from file ${this.trip.tripItinFile()}. ${err.message}`);
  }
}

function fetchItinerary() {
  this.itinDetails = (new CreateItinerary(this.trip, this.hometown)).getItinerary();  
}

module.exports = FormatCalendar;
