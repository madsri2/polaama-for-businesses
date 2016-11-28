'use strict';
const fs = require('fs');
const _ = require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();

// TODO: Remove tripName from all the functions being called and use this.tripName
function TripData(tripName) {
  this.tripName = myEncode(tripName);
}

// ======== Retrieve from trip =======
TripData.prototype.getInfoFromTrip = function(tripKey) {
  const trip = retrieveTrip(this.tripName);
  if(_.isUndefined(trip) || _.isUndefined(trip[tripKey])) {
    logger.info("could not find " + tripKey + " for trip " + this.tripName);
    return undefined;
  }
  logger.info(`Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.destination}`);
  return trip[tripKey];
}

function retrieveTrip(tripName) {
  try {
    const file = tripFile(tripName);
    fs.accessSync(file, fs.F_OK);
    try {
      const trip = JSON.parse(fs.readFileSync(file, 'utf8')); 
      return trip;
    }
    catch(err) {
      logger.error("error reading from ",file, err.stack);
      return null;
    }
  }
  catch(err) {
      logger.info("file does not exist. returning empty map");
      return {}; 
  }
}

// ========= URL paths ========
TripData.prototype.commentUrlPath = function() {
  return `${this.tripName}/comments`;
}

TripData.prototype.todoUrlPath = function() {
  return `${this.tripName}/todo`;
}

TripData.prototype.packListPath = function() {
  return `${this.tripName}/pack-list`;
}

// ======= Store data =======
TripData.prototype.persistTrip = function(tripName, context) {
  logger.info("calling persistTrip");
  const trip = {};
  trip['destination'] = context.destination;
  trip['duration'] = context.duration;
  trip['startDate'] = context.datetime;
  // TODO: Get this information from weather API or the file persisted.
  trip['weather'] = "sunny";
  trip['packList'] = createPackList(trip['weather']);
  trip['todoList'] = createTodoList(trip);
  trip['comments'] = [
    "Average water temperature will be around 60F, not suitable for swimming",
  ];

  persistUpdatedTrip(tripName, trip);
}

TripData.prototype.storeTodoList = function(senderId, messageText) {
  const reg = new RegExp("^todo[:]*[ ]*","i"); // ignore case
  return storeList(this.tripName, senderId, messageText, reg, "todoList", "get todo");  
}

TripData.prototype.storePackList = function(senderId, messageText) {
  const reg = new RegExp("^pack[:]*[ ]*","i"); // ignore case
  return storeList(this.tripName, senderId, messageText, reg, "packList", "get pack list");  
}

/*
 * Store whatever string the user input and return "Saved!"
 */
TripData.prototype.storeFreeFormText = function(senderId, messageText) {
  const reg = new RegExp("^save:?[ ]*","i"); // ignore case
  return storeList(this.tripName, senderId, messageText, reg, "comments", "comments, get comments or retrieve");
}

function storeList(tripName, senderId, messageText, regex, key, retrieveString) {
  const trip = retrieveTrip(tripName);
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!(key in trip)) {
    trip[key] = [];
  } 
  trip[key] = trip[key].concat(items);
  // store it locally
  persistUpdatedTrip(tripName, trip);
  logger.info("successfully stored item " + items + " in " + key);
  return `Saved! You can retrieve this by saying "${retrieveString}"`;
}

// ======== Encode =======
//TODO: This needs to be a local function. It should not be used anywhere else.
TripData.encode = function(tripName) {
  return myEncode(tripName);
}

TripData.todo = "todoList";

function myEncode(tripName) {
  return tripName.toLowerCase().replace(" ","_");
}

function createPackList(weather) {
  var packList = [];
  // if the weather is sunny, add corresponding items.
  switch(weather) {
    case "sunny": 
      packList.push("cap/hat");
      packList.push("sunglass");
      break;
  }

  return packList;
}

function createTodoList(trip) {
  var todoList = [];
  todoList.push("Flight tickets");
  todoList.push("Place to stay");
  todoList.push("Rental car");

  return todoList;
}

function tripFile(tripName) {
  // TODO: check parameters
  return `trips/${myEncode(tripName)}.txt`;
}

function persistUpdatedTrip(tripName, trip) {
  const file = tripFile(tripName);
  try {
    fs.writeFileSync(file, JSON.stringify(trip));
    logger.info("saved trip for ",tripName);
    return true;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
    return false;
  }
}

module.exports = TripData;
