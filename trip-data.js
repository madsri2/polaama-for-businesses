'use strict';
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const logger = require('./my-logger');
const tripBaseDir = "trips";
const Country = require('./country');
const Encoder = require('./encoder');

// TODO: This is leaking data model to other classes. Fix this by moving all functionality that require this variable into a function in this class.
TripData.todo = "todoList";

function TripData(tripName) {
  this.rawTripName = tripName;
  retrieveTripData.call(this);
  if(!Object.keys(this.data).length) {
    // New trip: update trip with information to be persisted later
    this.data.name = myEncode(tripName);
    this.data.rawName = tripName;
  }
  else {
    this.country = new Country(this.data.destination);
  }
}

// return the list of raw names for each trip.
TripData.getTrips = function() {
  let tripList = [];
  fs.readdirSync(tripBaseDir).forEach(name => {
    if(!name.startsWith(".")) {
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

// ======== Retrieve from trip =======
TripData.prototype.getInfoFromTrip = function(tripKey) {
  const trip = this.data;
  if(_.isUndefined(trip) || _.isUndefined(trip[tripKey])) {
    logger.info(`Could not find ${tripKey} for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  logger.info(`trip-data.js:getInfoFromTrip Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.destination}`);
  return trip[tripKey];
}

TripData.prototype.getPackList = function() {
  const trip = this.data;
  if(_.isUndefined(trip) || _.isUndefined(trip.packList)) {
    logger.info(`Could not find packList for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  if(trip.packList.toPack) {
    logger.info(`There are ${trip.packList.toPack.length} to pack items in pack list`);
  }
  if(trip.packList.done) {
    logger.info(`There are ${trip.packList.done.length} done items in pack list`);
  }
  return trip.packList;
}

function retrieveTripData() {
  try {
    const file = tripFile.call(this);
    fs.accessSync(file, fs.F_OK);
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')); 
      // console.log(`raw name from file ${file} is ${this.data.rawName}`);
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

TripData.prototype.weatherUrlPath = function() {
  return `${this.data.name}/comments/weather`;
}

TripData.prototype.flightUrlPath = function() {
  return `${this.data.name}/comments/flight`;
}

TripData.prototype.stayUrlPath = function() {
  return `${this.data.name}/comments/stay`;
}

TripData.prototype.activitiesUrlPath = function() {
  return `${this.data.name}/comments/activities`;
}

// ======= Store data =======
TripData.prototype.addTripDetailsAndPersist = function(tripDetails) {
  this.data = {}; 
  this.data.name = myEncode(this.rawTripName);
  this.data.rawName = this.rawTripName;
  this.data.destination = myEncode(tripDetails.destination);
  this.country = new Country(tripDetails.destination);
  this.data.duration = tripDetails.duration;
  // TODO: The date format needs to be identified and converted to the needed format.
  if(tripDetails.datetime) {
    this.data.startDate = tripDetails.datetime;
  }
  else if(tripDetails.startDate) {
    this.data.startDate = tripDetails.startDate;
  }
  // TODO: Get this information from weather API or the file persisted.
  this.data.weather = "sunny";
  createPackList.call(this);
  createTodoList.call(this);
  this.persistUpdatedTrip();
}

TripData.prototype.addCities = function(cities) {
  this.data.cities = cities;
  this.persistUpdatedTrip();
}

TripData.prototype.storeTodoList = function(senderId, messageText) {
  const reg = new RegExp("^todo[:]*[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "todoList", "get todo");  
}

//TODO: senderId is not being used here. So remove it and update the place where this function is called.
TripData.prototype.storePackList = function(senderId, messageText) {
  const regex = new RegExp("^pack[:]*[ ]*","i"); // ignore case
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(_.isUndefined(this.data.packList)) {
    this.data.packList = {};
    this.data.packList.toPack = [];
    this.data.packList.done = [];
  } 
  this.data.packList.toPack = this.data.packList.toPack.concat(items);
  // store it locally
  this.persistUpdatedTrip();
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
  this.persistUpdatedTrip();
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
    else if((item.indexOf("flight") > -1) || 
            (item.indexOf("air") > -1) || 
            (item.indexOf("alaska") > -1) || 
            (item.indexOf("united") > -1) || 
            (item.indexOf("southwest") > -1) || 
            (item.indexOf("delta") > -1)) {
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
  if(!Object.keys(comments).length) {
    return {};
  }
  return getActivitiesFromComments(comments);
}

TripData.prototype.persistUpdatedTrip = function() {
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

// ======== Encode =======
// TODO: Make this private by removing/refactoring other references
TripData.encode = function(name) {
  return myEncode(name);
}

function myEncode(name) {
  return Encoder.encode(name);
  // return name.toLowerCase().replace(" ","_");
}

function createPackList() {
  // if the weather is sunny, add corresponding items.
  switch(this.data.weather) {
    case "sunny": 
      this.storePackList("unused", "A hat, Sunglasses, Rain Jacket, Gloves, Winter coat");
      break;
  }
  this.storePackList("unused", "Travel adapter");
  // TODO: Use http://www.myweather2.com/swimming-and-water-temp-index.aspx to determine if beach is swimmable and update accordingly
  return;
}

function createTodoList() {
  this.data.todoList = [];
  this.data.todoList.push("Flight tickets");
  this.data.todoList.push("Place to stay");
  this.data.todoList.push("Rental car");
  this.data.todoList.push("[US Citizens only] Enroll in STEP (https://step.state.gov/step/) to get travel alerts and warnings.");
}

function tripFile() {
  // TODO: check parameters
  // can't use this.data because it is populated with the file contents, which might not exist yet.
  return `${tripBaseDir}/${myEncode(this.rawTripName)}.txt`;
}

TripData.prototype.tripDataFile = function() {
  return `${tripBaseDir}/${this.data.name}-data.txt`;
}

module.exports = TripData;
