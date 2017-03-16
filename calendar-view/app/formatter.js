'use strict';

const logger = require('../../my-logger');
const fs = require('fs');

const alphabet = ['a','b','c','d','e','f','g'];
const dayString = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];


// This class gets data from trips/portugal-itinerary.txt and creates a calendar view from that information.

function FormatCalendar(trip) {
  this.trip = trip;
  this.tripData = this.trip.data;
  this.tripName = this.trip.rawTripName;
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
  // console.log(`getPopupContents: Getting details for ${day}`);
  const cityDetails = this.itinDetails[day];
  if(!cityDetails || Object.keys(cityDetails).length == 0 || !cityDetails.name) {
    logger.info(`getPopupContents: No details present for day ${day}`);
    return "";
  }
  const popupId = `${cityDetails.name}-${day}`;
  let contents = `<a href="#${popupId}" data-rel="popup" data-transition="pop" class="ui-btn ui-corner-all ui-btn-inline ui-mini ui-shadow" title="Plan Details">${capitalize1stChar(cityDetails.name)}</a>`;
  contents += `<div data-role="popup" id="${popupId}" class="ui-content" data-theme="a" style="max-width:350px;" data-arrow="true">`;
  // logger.info(`details for ${cityDetails.name}: ${JSON.stringify(cityDetails)}`);
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
  const html = "/home/ec2-user/html-templates/trip-calendar-view.html";
  try {
    return fs.readFileSync(html, 'utf8');
  }
  catch(err) {
    logger.info(`could not read html from file ${this.trip.tripItinFile()}. ${err.message}`);
  }
}

function fetchItinerary() {
  try {
    this.itinDetails = JSON.parse(fs.readFileSync(this.trip.tripItinFile(),'utf8'));
  }
  catch(err) {
    logger.info(`could not read trip itinerary details from file ${this.trip.tripItinFile()}. ${err.message}`);
  }
}

module.exports = FormatCalendar;
