'use strict';
const fs = require('fs');
const _ = require('lodash');
const TripData = require('./trip-data');
const Log = require('./logger');
const logger = (new Log()).init();

function TripDataFormatter(tripName) {
  this.tripData = new TripData(tripName);
}

TripDataFormatter.prototype.formatListResponse = function(headers, key) {
  const tripName = this.tripData.tripName;
  const list = this.tripData.getInfoFromTrip(key);
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
  const comments = this.tripData.parseComments();
  const html = fs.readFileSync("collapsible-template.js", 'utf8');
  return html.replace("${mainHeader}","Trip details").replace("${header1}","Activities Details").replace("${list1}",listAsHtml(comments.activities)).replace("${header2}","Stay Details").replace("${list2}",listAsHtml(comments.stay)).replace("${header3}","Flight Details").replace("${list3}",listAsHtml(comments.flight)).replace("${header4}","Rental car Details").replace("${list4}",listAsHtml(comments.car)).replace("${header5}","Other comments").replace("${list5}",listAsHtml(comments.others));
}

TripDataFormatter.prototype.formatTripDetails = function() {
  const comments = this.tripData.parseComments();
  const todo = this.tripData.getInfoFromTrip(TripData.todo);
  const packList = this.tripData.getInfoFromTrip("packList");
}

function listAsHtml(list) {
  let html = "<ol>";
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
