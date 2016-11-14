'use strict';

var _ = require('lodash');
var rp = require('request-promise');
const ENDPOINT = 'https://polaama.com';

function TripPlanner() {}

function callPolaama(tripName, suffix) {
  const packUrl = _.template("${endpoint}/${tripName}/${suffix}")({
    endpoint: ENDPOINT,
    tripName: tripName,
    suffix: suffix
  });
  var options = {
    method: 'GET',
    uri: packUrl,
    resolveWithFullResponse: true,
    json: true
  };

  console.log("will call polaama endpoint " + packUrl);
  return rp(options).then(function(response) {
    console.log("success - polaama responded");
    return response.body;
  });
}

TripPlanner.prototype.getPackList = function(tripName) {
  return callPolaama(tripName, "pack-list");
}

TripPlanner.prototype.getTodoList = function(tripName) {
  console.log("called getTodoList");
  return callPolaama(tripName, "todo");
}

TripPlanner.prototype.formatTodoList = function(tripName, todoList) {
  console.log("formatTodoList called with trip " + tripName + " and todo list " + JSON.stringify(todoList));
  return _.template('There are ${length} items to do before your trip to ${tripName}. They are ${pl}.')({
    length: todoList.length,
    tripName: tripName,
    pl: todoList.join()
  });
}

TripPlanner.prototype.formatPackList = function(tripName, packList) {
  console.log("formatPackList called with trip " + tripName + " and pack list " + JSON.stringify(packList));
  return _.template('There are ${length} items to pack for your trip to ${tripName}. They are ${pl}.')({
    length: packList.length,
    tripName: tripName,
    pl: packList.join()
  });
}

module.exports = TripPlanner;
