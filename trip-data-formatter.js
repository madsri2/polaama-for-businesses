'use strict';
const fs = require('fs');
const _ = require('lodash');
const TripData = require('./trip-data');
const logger = require('./my-logger');

function TripDataFormatter(tripData) {
  // TODO: This needs to change when we add login by facebook to myFirstHttpServer.
  this.trip = tripData;
}

TripDataFormatter.prototype.formatListResponse = function(headers, key) {
  const tripName = this.trip.data.name;
  const list = this.trip.getInfoFromTrip(key);
  if(_.isUndefined(list)) {
    return `Could not find ${key} for trip ${tripName}`;
  }
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("header or user-agent not defined. sending back json");
    return list;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("request call from browser. sending back html");
    return listAsHtml(list);
  }
  logger.info("request call from something other than browser. sending back json");
  return list;
}

TripDataFormatter.prototype.formatComments = function() {
  const comments = this.trip.parseComments();
  const html = fs.readFileSync("html-templates/comments.html", 'utf8');
  return html.replace("${tripName}",this.trip.rawTripName)
    .replace("${activityList}",listAsHtml(comments.activities))
    .replace("${stayList}",listAsHtml(comments.stay))
    .replace("${flightList}",listAsHtml(comments.flight))
    .replace("${rentalCarList}",listAsHtml(comments.car))
    .replace("${expenseReportDetails}",listAsHtml(comments.expenses))
    .replace("${otherComments}",listAsHtml(comments.others));
}

// TODO: Comments section here is a duplicate of formatComments above. Fix it.
TripDataFormatter.prototype.formatTripDetails = function(weatherDetails, activityDetails) {
  const comments = this.trip.parseComments();
  const todoList = this.trip.getInfoFromTrip(TripData.todo);
  const packList = this.trip.getPackList();
  let activities = listAsHtml(comments.activities);
  activities += formatActivities.call(this, activityDetails);
  const html = fs.readFileSync("html-templates/trip-page.html", 'utf8');
  return html.replace("${tripName}",this.trip.rawTripName)
    .replace("${activityDetails}",activities)
    .replace("${weatherDetails}", formatWeatherDetails.call(this, weatherDetails))
    .replace("${stayDetails}",listAsHtml(comments.stay))
    .replace("${flightDetails}",listAsHtml(comments.flight))
    .replace("${carDetails}",listAsHtml(comments.car))
    .replace("${expenseReportDetails}",listAsHtml(comments.expenses))
    .replace("${otherComments}",listAsHtml(comments.others))
    .replace("${todoList}",listAsHtml(todoList))
    .replace("${toPackList}",listAsHtml(packList.toPack))
    .replace("${donePackList}",listAsHtml(packList.done));
}

TripDataFormatter.prototype.formatPackList = function(headers) {
  const packList = this.trip.getPackList();
  const tripName = this.trip.data.name;
  if(_.isUndefined(packList)) {
    return `Could not find packList for trip ${tripName}`;
  }
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("header or user-agent not defined. sending back json");
    return list;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("request call from browser. sending back html");
    const html = fs.readFileSync("html-templates/pack-list.html", 'utf8');
    return html.replace("${toPackList}",listAsHtml(packList.toPack))
      .replace("${tripName}", this.trip.rawTripName)
      .replace("${donePackList}",listAsHtml(packList.done));
  }
  logger.info("request call from something other than browser. sending back json");
  return packList.toPack;
}

function formatWeatherDetails(weatherDetails) {
  const keys = Object.keys(weatherDetails);
  if(keys.indexOf("nocity") > -1) {
    // no weather details available since the trip does not have any city information
    return weatherDetails.nocity;
  }

  let wText = `<div data-role="collapsibleset">\n`;

  keys.forEach(city => {
      wText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
      wText += `<h1>${city}</h1>\n`;
      weatherDetails[city].forEach(note => {
          wText += `<p>${toLink(note)}</p>\n`;
          });
      wText += `</div>\n`;
      });

  wText += `</div>\n`;
  return wText;
}

TripDataFormatter.prototype.formatWeatherDetails = function(weatherDetails, addlWeatherDetails) {
  const html = fs.readFileSync("html-templates/weather-details.html", 'utf8');
  const formattedWeatherDetails = formatWeatherDetails.call(this, weatherDetails);
  return html.replace("${citiesWeatherDetails}", formattedWeatherDetails)
             .replace("${additionalWeatherDetails}", toLink(addlWeatherDetails));
}

function formatActivities(activityDetails) {
  const keys = Object.keys(activityDetails);
  if(keys.indexOf("nocity") > -1) {
    // no activity details available since the trip does not have any city information
    return activityDetails.nocity;
  }
  let aText = `<div data-role="collapsibleset">\n`;
  keys.forEach(city => {
      aText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
      aText += `<h1>${city}</h1>\n`;
      activityDetails[city].forEach(note => {
          aText += `<p>${toLink(note)}</p>\n`;
          });
      aText += `</div>\n`;
      });
  aText += `</div>\n`;
  return aText;
}

// TODO: Might be a duplicate of above function.
TripDataFormatter.prototype.formatActivityDetails = function(activityDetails) {
  const html = fs.readFileSync("html-templates/activity-details.html", 'utf8');
  const aText = formatActivities.call(this, activityDetails);
  return html.replace("${activityDetails}", aText);
}

/*
   {
   "Seattle to Lisbon roundtrip": [
   {
   },
   {
   "price":
   "bookLink":
   "agent":
   "onward": {
   "travelDate":
   "duration":
   "stops":
   "segments":
   },
   "return": {
   "travelDate":
   "duration":
   "stops":
   "segments":
   }
   }
   }

   Itinerary 1:
Price: $780/-; Agent: ; Link: ;
Onward:
Stops: ; 
Segment Details:
Start date: ; Return date: ; Duration: ; Origin: ; Destination: ; Flight: ; Flight Name: ;
Return:
Segment Details:
Start date: ; Return date: ; Duration: ; Origin: ; Destination: ; Flight: ; Flight Name: ;
*/
TripDataFormatter.prototype.formatFlightDetails = function(flightDetails) {
  const html = fs.readFileSync("html-templates/flight-details.html", 'utf8');

  const keys = Object.keys(flightDetails);
  if(keys.indexOf("noflight") > -1) {
    return html.replace("${flightDetails}", flightDetails.noflight);
  }
  let fText = `<div data-role="collapsibleset">\n`;
  keys.forEach(fromTo => {
    fText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
    fText += `<h1>${fromTo} roundtrip</h1>\n`;
    const itinList = flightDetails[fromTo];
    for(let i = 0; i < itinList.length; i++) {
      fText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
        fText += `<h1>Itinerary ${i+1}</h1>\n`;
        const itin = itinList[i];
        const options = itin.options[0];
        fText += `<p>Price per person: $${options.price}/-; Agent: ${options.agent}; <a href=${options.uri}>Book it</a></p>\n`;
        fText += _itinDetailsHtml("Onward", itin.outbound);
        fText += _itinDetailsHtml("Return", itin.inbound);
      fText += "</div>\n"; // itinerary collapsible
    }
    fText += "</div>\n"; // fromTo collapsible
  });
  fText += `</div>\n`; // close for collapsible set
  return html.replace("${flightDetails}", fText);
}

function _itinDetailsHtml(title, details) {
  let html = `<h2>${title}</h2>\n`;
  html += `<p>Stops: ${details.stops}; Leave at: ${details.departure}; Arrive at: ${details.arrival}; Duration: ${details.duration}; </p>\n`;
  html += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
  html += "<h2>Segment Details</h2>\n";
  details.segmentDetails.forEach(segment => {
    html += `<p>Leave at: ${segment.departure}; Arrive: ${segment.arrival}; Duration: ${segment.duration}; Origin: ${segment.origin}; Destination: ${segment.destination}; Flight: ${segment.airlines}; FlightNum: ${segment.flightNum}</p>\n`;
  });
  html += "</div>\n"; // segment collapsible
  return html;
}

TripDataFormatter.prototype.formatHandleTravelersPage = function() {
  return fs.readFileSync("html-templates/new-trip-handle-travelers.html", 'utf8');
}

// choosing cities for a new trip. This will include selecting a port of entry as well.
TripDataFormatter.prototype.formatCities = function() {
  if(_.isUndefined(this.trip.country)) {
    logger.warn(`formatCities: No country information for ${this.trip.data.name}`);
    return `No cities for country ${this.trip.data.name}`;
  }
  const cities = this.trip.country.cities;
  logger.info(`Found ${cities.length} cities in ${this.trip.data.name}`);
  let selection = "";
  cities.forEach(city => {
      selection += `<option value="${city}">${city}</option>`;
      });
  return fs.readFileSync("html-templates/cities.html", 'utf8')
    .replace("${cityList}", selection)
    .replace("${portOfEntryList}", selection)
    .replace("${country}", this.trip.data.destination);
}

// adding cities for existing trip
TripDataFormatter.prototype.addCitiesExistingTrip = function() {
  if(_.isUndefined(this.trip.country)) {
    logger.warn(`addCitiesExistingTrip: No country information for ${this.trip.data.name}`);
    return `No cities for country ${this.trip.data.name}`;
  }
  const cities = this.trip.country.cities;
  logger.info(`Found ${cities.length} cities in ${this.trip.data.name}`);
  let selection = "";
  cities.forEach(city => {
      selection += `<option value="${city}">${city}</option>`;
  });
  return fs.readFileSync("html-templates/add-cities.html", 'utf8')
    .replace("${cityList}", selection)
    .replace("${country}", this.trip.data.destination);
}

TripDataFormatter.prototype.formatCityChoicePage = function() {
  return fs.readFileSync("html-templates/handle-city-choice.html", 'utf8');
}

TripDataFormatter.prototype.formatExpensePage = function(reportSummary, spendSummary, comments) {
  const html = fs.readFileSync("html-templates/expense-reports.html", 'utf8');
  let ssHtml = "";
  Object.keys(spendSummary).forEach(fam => {
    ssHtml = ssHtml.concat(`<p>Family ${fam} spent ${spendSummary[fam]} dollars</p><br>`);
  });
  let summary = "";
  Object.keys(reportSummary).forEach(key => {
    const famOwed = reportSummary[key].owes.family;
    const amount = reportSummary[key].owes.amount;
    summary = summary.concat(`<p>Family ${key} owes ${famOwed} ${amount} dollars</p><br>`);
    console.log(summary);
  });

  return html.replace("${reportSummary}", summary)
             .replace("${spendSummary}", ssHtml)
             .replace("${expenseReportDetails}", listAsHtml(comments));
}

function toLink(text) {
  const words = text.split(' ');
  words.forEach((word, i) => {
      if(/^https?:\/\//.test(word)) {
      words[i] = `<a href=${word}>${word}</a>`;
      }
      });
  return words.join(' ');
}

function listAsHtml(list) {
  let html = "<ol>";
  if(_.isNull(list) || _.isUndefined(list) || _.isEmpty(list)) {
    return "";
  }
  list.forEach(function(item) {
    html += "<li>" + toLink(item) + "</li>";
  });
  html += "</ol>";
  return html;
}

module.exports = TripDataFormatter;
