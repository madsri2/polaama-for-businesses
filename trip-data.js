'use strict';
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const Log = require('./logger');
const logger = (new Log()).init();
const tripBaseDir = "trips";

// TODO: This is leaking data model to other classes. Fix this by moving all functionality that require this variable into a function in this class.
TripData.todo = "todoList";

// return the list of raw names for each trip.
TripData.getTrips = function() {
  let tripList = [];
  fs.readdirSync(tripBaseDir).forEach(name => {
    if(!name.startsWith(".")) {
      console.log(name);
      const tripData = JSON.parse(fs.readFileSync(`${tripBaseDir}/${name}`,'utf8'));
      // only add those trips whose start date is after today or we don't know the start date
      if(_.isUndefined(tripData.startDate) || moment(tripData.startDate).diff(moment(),'days') >= 0) { 
        tripList.push({
          name: tripData.name,
          rawName: tripData.rawName
        });
      }
    }
  });
  return tripList;
}

function TripData(tripName) {
  this.rawTripName = tripName;
  retrieveTripData.call(this);
  // TODO: Handle case where data does not exist yet.
  if(!Object.keys(this.data).length) {
    // persist
    console.log(`Creating a persistent object for new trip with name ${tripName}`); 
    this.data.name = myEncode(tripName);
    this.data.rawName = tripName;
    persistUpdatedTrip.call(this);
  }
}

// ======== Retrieve from trip =======
TripData.prototype.getInfoFromTrip = function(tripKey) {
  const trip = this.data;
  if(_.isUndefined(trip) || _.isUndefined(trip[tripKey])) {
    logger.info(`Could not find ${tripKey} for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  logger.info(`Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.destination}`);
  return trip[tripKey];
}

TripData.prototype.getPackList = function() {
  const trip = this.data;
  if(_.isUndefined(trip) || _.isUndefined(trip.packList)) {
    logger.info(`Could not find packList for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  logger.info(`There are ${trip.packList.toPack.length} to pack items and ${trip.packList.done.length} to pack items in pack list`);
  return trip.packList;
}

function retrieveTripData() {
  try {
    const file = tripFile.call(this);
    fs.accessSync(file, fs.F_OK);
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')); 
    }
    catch(err) {
      logger.error("error reading from ",file, err.stack);
    }
  }
  catch(err) {
      logger.info("file does not exist. creating empty data object so it can be filled elsewhere");
      this.data = {};
  }
}

// ========= URL paths ========
TripData.prototype.commentUrlPath = function() {
  return `${this.data.name}/comments`;
}

TripData.prototype.todoUrlPath = function() {
  return `${this.data.name}/todo`;
}

TripData.prototype.packListPath = function() {
  return `${this.data.name}/pack-list`;
}

// ======= Store data =======
TripData.prototype.persistTrip = function(context) {
  logger.info("calling persistTrip");
  this.data = {}; 
  this.data.name = myEncode(this.rawTripName);
  this.data.destination = context.destination;
  this.data.duration = context.duration;
  this.data.startDate = context.datetime;
  // TODO: Get this information from weather API or the file persisted.
  this.data.weather = "sunny";
  this.data.packList = createPackList.call(this);
  this.data.todoList = createTodoList.call(this);
  this.data.comments = [
    "Average water temperature will be around 60F, not suitable for swimming",
  ];
  persistUpdatedTrip.call(this);
}

TripData.prototype.storeTodoList = function(senderId, messageText) {
  const reg = new RegExp("^todo[:]*[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "todoList", "get todo");  
}

TripData.prototype.storePackList = function(senderId, messageText) {
  const regex = new RegExp("^pack[:]*[ ]*","i"); // ignore case
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!this.data.packList) {
    this.data.packList = {};
    this.data.packList.toPack = [];
    this.data.packList.done = [];
  } 
  this.data.packList.toPack = this.data.packList.toPack.concat(items);
  // store it locally
  persistUpdatedTrip.call(this);
  logger.info(`successfully stored item ${items} in packList's toPack list`);
  return `Saved! You can retrieve this by saying get pack list`;
}

/*
 * Store whatever string the user input and return "Saved!"
 */
TripData.prototype.storeFreeFormText = function(senderId, messageText) {
  const reg = new RegExp("^save:?[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "comments", "comments, get comments or retrieve");
}

function storeList(senderId, messageText, regex, key, retrieveString) {
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!(key in this.data)) {
    this.data[key] = [];
  } 
  this.data[key] = this.data[key].concat(items);
  // store it locally
  persistUpdatedTrip.call(this);
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
TripData.encode = function(name) {
  return myEncode(name);
}


function myEncode(name) {
  return name.toLowerCase().replace(" ","_");
}

function createPackList() {
  this.data.packList = [];
  // if the weather is sunny, add corresponding items.
  switch(this.data.weather) {
    case "sunny": 
      this.data.packList.push("cap/hat");
      this.data.packList.push("sunglass");
      break;
  }

  return packList;
}

function createTodoList() {
  this.data.todoList = [];
  this.data.todoList.push("Flight tickets");
  this.data.todoList.push("Place to stay");
  this.data.todoList.push("Rental car");
}

function tripFile() {
  // TODO: check parameters
  // can't use this.data because it is populated with the file contents, which might not exist yet.
  return `${tripBaseDir}/${myEncode(this.rawTripName)}.txt`;
}

function persistUpdatedTrip() {
  const file = tripFile.call(this);
  try {
    fs.writeFileSync(file, JSON.stringify(this.data));
    logger.info("saved trip for ",this.data.name);
    return true;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
    return false;
  }
}

module.exports = TripData;
