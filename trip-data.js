'use strict';
const fs = require('fs');
const _ = require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();

TripData.todo = "todoList";

function TripData(tripName) {
  this.tripName = myEncode(tripName);
}

// ======== Retrieve from trip =======
TripData.prototype.getInfoFromTrip = function(tripKey) {
  const trip = retrieveTrip.call(this);
  if(_.isUndefined(trip) || _.isUndefined(trip[tripKey])) {
    logger.info("could not find " + tripKey + " for trip " + this.tripName);
    return undefined;
  }
  logger.info(`Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.destination}`);
  return trip[tripKey];
}

function retrieveTrip() {
  try {
    const file = tripFile.call(this);
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
TripData.prototype.persistTrip = function(context) {
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

  persistUpdatedTrip.call(this, trip);
}

TripData.prototype.storeTodoList = function(senderId, messageText) {
  const reg = new RegExp("^todo[:]*[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "todoList", "get todo");  
}

TripData.prototype.storePackList = function(senderId, messageText) {
  const reg = new RegExp("^pack[:]*[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "packList", "get pack list");  
}

/*
 * Store whatever string the user input and return "Saved!"
 */
TripData.prototype.storeFreeFormText = function(senderId, messageText) {
  const reg = new RegExp("^save:?[ ]*","i"); // ignore case
  return storeList(this, senderId, messageText, reg, "comments", "comments, get comments or retrieve");
}

function storeList(senderId, messageText, regex, key, retrieveString) {
  const trip = retrieveTrip.call(this);
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!(key in trip)) {
    trip[key] = [];
  } 
  trip[key] = trip[key].concat(items);
  // store it locally
  persistUpdatedTrip.call(this, trip);
  logger.info("successfully stored item " + items + " in " + key);
  return `Saved! You can retrieve this by saying "${retrieveString}"`;
}

function getActivitiesFromComments(comments) {
  const taggedComments = {
    activities: [],
    stay: [],
    flight: [],
    others: [],
    car: []
  };
  comments.forEach(function(i) {
    const item = i.toLowerCase();
    // activities
    if((item.indexOf("beach") > -1) || (item.indexOf("garden") > -1) || (item.indexOf("market") > -1)) {
      taggedComments.activities.push(i);
    }
    // stay
    else if((item.indexOf("hotel") > -1) || (item.indexOf("condo") > -1) || (item.indexOf("airbnb") > -1)) {
      taggedComments.stay.push(i);
    }
    // flight
    else if((item.indexOf("flight") > -1) || (item.indexOf("air") > -1) || (item.indexOf("alaska") > -1)) {
      taggedComments.flight.push(i);
    }
    // car
    else if((item.indexOf("car") > -1) || (item.indexOf("uber") > -1) || (item.indexOf("suv") > -1)) {
      taggedComments.car.push(i);
    }
    // everything else
    else {
      taggedComments.others.push(i);
    }
  });
  logger.info(`There were ${taggedComments.activities.length} activities, ${taggedComments.stay.length} stay details, ${taggedComments.flight.length} flight details, ${taggedComments.car.length} car details, ${taggedComments.others.length} remaining comments`);
  return taggedComments;
}

TripData.prototype.parseComments = function() {
  const comments = this.getInfoFromTrip("comments"); 
  return getActivitiesFromComments(comments);
}

// ======== Encode =======
// TODO: Make this private by removing/refactoring other references
TripData.encode = function(tripName) {
  return myEncode(tripName);
}


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

function tripFile() {
  // TODO: check parameters
  return `trips/${myEncode(this.tripName)}.txt`;
}

function persistUpdatedTrip(trip) {
  const file = tripFile.call(this);
  try {
    fs.writeFileSync(file, JSON.stringify(trip));
    logger.info("saved trip for ",this.tripName);
    return true;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
    return false;
  }
}

module.exports = TripData;
