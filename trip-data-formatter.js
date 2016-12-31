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
             .replace("${otherComments}",listAsHtml(comments.others));
}

TripDataFormatter.prototype.formatTripDetails = function() {
  const comments = this.trip.parseComments();
  const todoList = this.trip.getInfoFromTrip(TripData.todo);
  const packList = this.trip.getPackList();
  const html = fs.readFileSync("html-templates/trip-page.html", 'utf8');
  return html.replace("${tripName}",this.trip.rawTripName)
             .replace("${header1}","Activities Details")
             .replace("${list1}",listAsHtml(comments.activities))
             .replace("${header2}","Stay Details")
             .replace("${list2}",listAsHtml(comments.stay))
             .replace("${header3}","Flight Details")
             .replace("${list3}",listAsHtml(comments.flight))
             .replace("${header4}","Rental car Details")
             .replace("${list4}",listAsHtml(comments.car))
             .replace("${header5}","Other comments")
             .replace("${list5}",listAsHtml(comments.others))
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

TripDataFormatter.prototype.formatWeatherDetails = function(weatherDetails, addlWeatherDetails) {
  const html = fs.readFileSync("html-templates/weather-details.html", 'utf8');
  const keys = Object.keys(weatherDetails);
  if(keys.indexOf("nocity") > -1) {
    // no weather details available since the trip does not have any city information
    return html.replace("${citiesWeatherDetails}", weatherDetails.nocity);
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
  return html.replace("${citiesWeatherDetails}", wText).replace("${additionalWeatherDetails}", toLink(addlWeatherDetails));
}

// TODO: Might be a duplicate of above function.
TripDataFormatter.prototype.formatActivityDetails = function(activityDetails) {
  const html = fs.readFileSync("html-templates/activity-details.html", 'utf8');

  const keys = Object.keys(activityDetails);
  if(keys.indexOf("nocity") > -1) {
    // no activity details available since the trip does not have any city information
    return html.replace("${activityDetails}", activityDetails.nocity);
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
  return html.replace("${activityDetails}", aText);
}

TripDataFormatter.prototype.formatFlightDetails = function() {
  return fs.readFileSync("html-templates/flight-details.html", 'utf8');
}

TripDataFormatter.prototype.formatHandleTravelersPage = function() {
  return fs.readFileSync("html-templates/new-trip-handle-travelers.html", 'utf8');
}

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
    .replace("${country}", this.trip.data.destination);
}

TripDataFormatter.prototype.formatCityChoicePage = function() {
  return fs.readFileSync("html-templates/handle-city-choice.html", 'utf8');
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
    /*
    const itemWords = item.split(' ');
    itemWords.forEach(function(word,i) {
      itemWords[i] = toLink(word);
    });
    item = itemWords.join(' ');
    */
    html += "<li>" + toLink(item) + "</li>";
  });
  html += "</ol>";
  return html;
}

module.exports = TripDataFormatter;
