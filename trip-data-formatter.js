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

TripDataFormatter.prototype.formatWeatherDetails = function() {
    const html = fs.readFileSync("html-templates/weather-details.html", 'utf8');
    return html;
}

TripDataFormatter.prototype.formatFlightDetails = function() {
    const html = fs.readFileSync("html-templates/flight-details.html", 'utf8');
    return html;
}

function listAsHtml(list) {
  let html = "<ol>";
  if(_.isNull(list) || _.isUndefined(list) || _.isEmpty(list)) {
    return "";
  }
  list.forEach(function(item) {
    const itemWords = item.split(' ');
    itemWords.forEach(function(word,i) {
      if(/^https?:\/\//.test(word)) {
        const wordUrl = "<a href=" + word + ">" + word + "</a>";
        itemWords[i] = wordUrl;
      }
    });
    item = itemWords.join(' ');
    html += "<li>" + item + "</li>";
  });
  html += "</ol>";
  return html;
}

module.exports = TripDataFormatter;
