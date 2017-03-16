'use strict';
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const logger = require('./my-logger');
const tripBaseDir = "/home/ec2-user/trips";
const Country = require('./country');
const Encoder = require('./encoder');

// TODO: This is leaking data model to other classes. Fix this by moving all functionality that require this variable into a function in this class.
TripData.todo = "todoList";

function TripData(tripName) {
  this.rawTripName = tripName;
  this.retrieveTripData();
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
// TODO: Figure out who is using this and reconcile with the use of session.getFutureTrips
TripData.getTrips = function() {
  let tripList = [];
  fs.readdirSync(tripBaseDir).forEach(name => {
    if(!name.startsWith(".")) {
      const tripData = JSON.parse(fs.readFileSync(`${tripBaseDir}/${name}`,'utf8'));
      // only add those trips whose start date is after today or we don't know the start date
      if(_.isUndefined(tripData.startDate) || 
         moment(tripData.startDate).diff(moment(),'days') >= 0) { 
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

TripData.prototype.retrieveTripData = function() {
  const file = tripFile.call(this);
  try {
    fs.accessSync(file, fs.F_OK);
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')); 
      if(this.data.cities) {
        this.citySet = new Set();
        this.data.cities.forEach(city => {
          this.citySet.add(city);
        }, this);
      }
      // console.log(`raw name from file ${file} is ${this.data.rawName}`);
    }
    catch(err) {
      logger.error(`error reading from file ${file}: ${err.stack}`);
    }
  }
  catch(err) {
      // logger.info(`File ${file} does not exist. Creating empty this.data object so it can be filled elsewhere`);
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

TripData.prototype.expenseReportUrlPath = function() {
  return `${this.data.name}/expense-report`;
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
  // rename destination to country.
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
  if(tripDetails.tripStarted) {
    this.data.tripStarted = tripDetails.tripStarted;
  }
  const sdIso = new Date(this.data.startDate).toISOString();
  this.data.startDate = moment(sdIso).format("YYYY-MM-DD");
  this.data.returnDate = moment(sdIso).add(this.data.duration,'days').format("YYYY-MM-DD");
  // TODO: Get this information from weather API or the file persisted.
  this.data.weather = "sunny";
  createPackList.call(this);
  createTodoList.call(this);
  this.persistUpdatedTrip();
}

TripData.prototype.addPortOfEntry = function(portOfEntry) {
  if(!_.isUndefined(portOfEntry)) {
    // this is needed for getting flight details.
    this.data.portOfEntry = Encoder.encode(portOfEntry);
  }
  else {
    logger.error("addPortOfEntry: port of entry is undefined");
  }
  this.persistUpdatedTrip();
}

TripData.prototype.addCities = function(cities) {
  // TODO: Make this a set
  if(_.isUndefined(this.citySet)) {
    this.citySet = new Set();
  }
  cities.forEach(city => {
    this.citySet.add(Encoder.encode(city));
  }, this);
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
  // logger.info(`successfully stored item ${items} in packList's toPack list`);
  return `Saved! You can retrieve this by saying get pack list`;
}

/*
 * Store whatever string the user input and return "Saved!"
 */
TripData.prototype.storeFreeFormText = function(senderId, messageText) {
  const reg = new RegExp("^save:?[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, reg, "comments", "comments, get comments or retrieve");
}

TripData.prototype.storeExpenseEntry = function(senderId, messageText) {
  const regex = new RegExp("^expense(-report)?:?[ ]*","i"); // ignore case
  return storeList.call(this, senderId, messageText, regex, "expenses", "get expense-report, get expenses or get expense details");
}

// TO DEPRECATE!
function getExpenseDetailsFromComments() {
  const comments = this.getInfoFromTrip("comments"); 
  let report = [];
  if(!Object.keys(comments).length) {
    logger.warn(`No comments found for trip ${this.rawTripName}. Returning empty list`);
    return report;
  }
  comments.forEach(item => {
    const encItem = item.toLowerCase();
    // expenses
    if(commentIsReportingExpense.call(this, encItem)) {
      report.push(item);
    }
  });
  return report;
} 

function commentIsReportingExpense(comment) {
  const item = comment.toLowerCase();
  if((item.indexOf("paid for") > -1) ||
     (item.indexOf("owes") > -1) || 
      item.toLowerCase().match(/.*paid \$?\d+/)) {
    return true;
  }
  return false;
}

TripData.prototype.getExpenseDetails = function() {
  const detailsFromComment = getExpenseDetailsFromComments.call(this);
  const expenseDetails = this.getInfoFromTrip("expenses"); 
  if(Array.isArray(expenseDetails)) {
    return detailsFromComment.concat(expenseDetails);
  }
  return detailsFromComment;
}

TripData.prototype.getTravelers = function() {
  return this.data.travelers;
}

function storeList(senderId, messageText, regex, key, retrieveString) {
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  if(!(key in this.data)) {
    this.data[key] = [];
  } 
  // this.data[key] is an array, so concat here merges two arrays.
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
    car: [],
    expenses: []
  };
  comments.forEach(function(i) {
    const item = i.toLowerCase();
    if(commentIsReportingExpense(item)) {
      taggedComments.expenses.push(i);
    }
    // activities
    else if((item.indexOf("beach") > -1) || 
       (item.indexOf("garden") > -1) || 
       (item.indexOf("market") > -1) || 
       (item.indexOf("activity") > -1) || 
       (item.indexOf("tower") > -1) || 
       (item.indexOf("castelo") > -1) || 
       (item.indexOf("wine tour") > -1) || 
       (item.indexOf("activities") > -1)) {
      taggedComments.activities.push(i);
    }
    // stay
    else if((item.indexOf("hotel") > -1) || 
            (item.indexOf("condo") > -1) || 
            (item.indexOf("airbnb") > -1) || 
            (item.indexOf("stay") > -1)) {
      taggedComments.stay.push(i);
    }
    // flight
    else if((item.indexOf("flight") > -1) || 
            (item.indexOf("air") > -1) || 
            (item.indexOf("alaska") > -1) || 
            (item.indexOf("united") > -1) || 
            (item.indexOf("southwest") > -1) || 
            (item.indexOf("arrive at") > -1) || 
            (item.indexOf("arrives at") > -1) || 
            (item.indexOf("leave on") > -1) || 
            (item.indexOf("depart") > -1) || 
            (item.indexOf("delta") > -1)) {
      taggedComments.flight.push(i);
    }
    // car
    else if((item.indexOf("car") > -1) || 
            (item.indexOf("uber") > -1) || 
            (item.indexOf("suv") > -1)) {
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
  if(this.citySet) {
    this.data.cities = [];
    this.citySet.forEach(city => {
      this.data.cities.push(city);
    }, this);
  }
  try {
    fs.writeFileSync(file, JSON.stringify(this.data));
    // logger.info("saved trip for ",this.data.name);
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
  return Encoder.encode(name);
}

function myEncode(name) {
  return Encoder.encode(name);
}

function createPackList() {
  // if the weather is sunny, add corresponding items.
  switch(this.data.weather) {
    case "sunny": 
      this.storePackList("unused", "A hat, Sunglasses, Sunscreen lotion");
      break;
    case "rainy":
      this.storePackList("unused", "Rain Jacket, Gloves");
      break;
    case "cold":
      this.storePackList("unused", "Winter coat, Gloves");
      break;
  }
  this.storePackList("unused", "Travel adapter");
  // TODO: Use http://www.myweather2.com/swimming-and-water-temp-index.aspx to determine if beach is swimmable and update accordingly
  return;
}

function createTodoList() {
  // TODO: So, check the travel duration and determine if visa is needed or not (instead of a static statement below
  const visaRequirements = {
    'india': `US Citizens need a tourist visa to travel to India. Electronic Tourist visas can be obtained from the <a href="https://indianvisaonline.gov.in/visa/tvoa.html">ETA website</a>. Additional details available at the <a href="https://travel.state.gov/content/passports/en/country/india.html">us.gov site</a>`,
    'australia': `US Citizens need an Electronic Travel Authority (ETA) visa to travel to India. It can be obtained from <a href="https://www.eta.immi.gov.au/ETAS3/etas">ETA Website</a>. Additional details are available at the <a href="https://travel.state.gov/content/passports/en/country/australia.html">us.gov site</a>`,
    'iceland': `US Citizens don't need a visa for stays less than 90 days, but please check the <a href="https://travel.state.gov/content/passports/en/country/iceland.html">us.gov site</a> for the latest information`,
    'israel': `US Citizens don't need a visa for stays less than 90 days, but please check the <a href="https://travel.state.gov/content/passports/en/country/israel.html">us.gov site</a> for the latest information`,
    'portugal': `US Citizens don't need a visa for stays less than 90 days, but please check the <a href="https://travel.state.gov/content/passports/en/country/portugal.html">us.gov site</a> for the latest information`
  };
  this.data.todoList = [];
  this.data.todoList.push("Flight tickets");
  this.data.todoList.push("Place to stay");
  this.data.todoList.push("Rental car");
  this.data.todoList.push("[US Citizens only] Enroll in STEP (https://step.state.gov/step/) to get travel alerts and warnings.");
  this.data.todoList.push(visaRequirements[this.data.destination]);
}

function tripFile() {
  // TODO: check parameters
  // can't use this.data because it is populated with the file contents, which might not exist yet.
  return `${tripBaseDir}/${myEncode(this.rawTripName)}.txt`;
}

TripData.prototype.tripDataFile = function() {
  return `${tripBaseDir}/${this.data.name}-data.txt`;
}

TripData.prototype.tripItinFile = function() {
  return `${tripBaseDir}/${this.data.name}-itinerary.txt`;
}

module.exports = TripData;
