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
  if(!tripName) {
    throw new Error("TripData: Required parameter tripName is undefined");
  }
  this.rawTripName = tripName;
  this.retrieveTripData();
  if(!Object.keys(this.data).length) {
    // New trip: update trip with information to be persisted later
    this.data.name = myEncode(tripName);
    this.data.rawName = tripName;
  }
  else {
    if(this.data.country) this.country = new Country(this.data.country);
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
  logger.info(`trip-data.js:getInfoFromTrip Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.country}`);
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

TripData.prototype.flightQuoteUrlPath = function() {
  return `${this.data.name}/flight-quotes`;
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
  if(tripDetails.destination) {
    this.data.country = myEncode(tripDetails.destination);
    this.country = new Country(tripDetails.destination);
  }
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
  // duration includes the start date, so subtract 1
  if(tripDetails.duration) {
    this.data.duration = tripDetails.duration;
    this.data.returnDate = moment(sdIso).add(this.data.duration - 1,'days').format("YYYY-MM-DD");
  }
  else {
    this.data.returnDate = "unknown";
  }
  // TODO: Get this information from weather API or the file persisted.
  this.data.weather = "sunny";
  createPackList.call(this);
  createTodoList.call(this);
  this.persistUpdatedTrip();
}

TripData.prototype.addPortOfEntry = function(portOfEntry) {
  if(portOfEntry) {
    // this is needed for getting flight details.
    this.data.portOfEntry = myEncode(portOfEntry);
  }
  else {
    logger.error("addPortOfEntry: port of entry is undefined");
  }
	logger.debug(`addPortOfEntry: Adding ${portOfEntry} as port of entry`);
  this.persistUpdatedTrip();
}

// compare the port of entry with the passed city. This is a separate function to ensure that the encoding of portOfEntry does not leak outside this file.
TripData.prototype.comparePortOfEntry = function(city) {
  if(this.data.portOfEntry && (this.data.portOfEntry === myEncode(city))) return true;
  return false;
}

TripData.prototype.getPortOfEntry = function() {
  return this.data.portOfEntry;
}

// This function resets the city itinerary object and cities object.
TripData.prototype.addCityItinerary = function(cities, numOfDays) {
  // read the data from file to make sure we don't miss anything.
  this.retrieveTripData();
  if(cities.length !== numOfDays.length) throw new Error("cities and numOfDays array lengths are different. cannot persist city itinerary information");
  if(!this.data.cityItin) {
    this.data.cityItin = {};
    this.data.cityItin.cities = [];
    this.data.cityItin.numOfDays = [];
  }
  if(!this.data.cities) this.data.cities = [];
  for(let i = 0; i < cities.length; i++) {
    this.data.cityItin.cities.push(myEncode(cities[i]));
    this.data.cities.push(myEncode(cities[i]));
  }
  this.data.cityItin.numOfDays = this.data.cityItin.numOfDays.concat(numOfDays);
  logger.debug(`addCityItinerary: City itinerary is ${JSON.stringify(this.data.cityItin)}`);
  logger.debug(`addCityItinerary: City list is ${this.data.cities}`);
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

TripData.prototype.userInputItinFile = function() {
  return `${tripBaseDir}/${this.data.name}-user-itinerary.txt`;
}


/*
  TODO: Since we have are writing to one file, there will be a race condition if two users attempt to update an itinerary. You need a lock to serialize in this case! This is true for any file writing that is done. Or, move to using dynamodb or something which will handle it for you
*/
// TODO: Fix ME! The returned value is a promise but promise.done does not work. This means that we CANNOT schedule any activity that depends on updateItinerary to complete.
TripData.prototype.updateItinerary = function(incDate, itinDetail){
  const filename = this.userInputItinFile();
  const readPromise = new Promise(function(fulfil, reject){
    const date = incDate.split("-").join("/"); // see calendar-view/app/formatter.js formatForMobile function.
    let contents = null;
    fs.readFile(filename, 'utf8', (err, data) => {
      if(err && err.code != 'ENOENT') {
        logger.error(`error reading file ${filename}: ${err.stack}`);
        reject(err);
      }
      if(!data) {
        logger.debug(`readPromise: empty file or file not present`);
        contents = {};
        contents[date] = [];
      }
      else {
        logger.debug(`readPromise: read ${data.length} bytes from ${filename}`);
        contents = JSON.parse(data);
        if(!contents[date]) contents[date] = [];
      }
      contents[date].push(itinDetail);
      fulfil(contents);
    });
  });
  return readPromise.then(
    function(contents) {
      const json = JSON.stringify(contents);
      return new Promise(function(fulfil, reject) {
        fs.writeFile(filename, json, (err) => { 
          if(err) return reject(err); 
          logger.debug(`writePromise: wrote ${json.length} bytes to ${filename}`);
        });
        return fulfil("success");
      });
    },
    function(e) {
      logger.error(`updateItinerary: Error: ${e.stack}`);
      return e;
    }
  );
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
     (item.indexOf(" owes ") > -1) || 
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
  logger.debug("successfully stored item " + items + " in " + key);
  return `Saved! You can retrieve this by saying "${retrieveString}"`;
}

// return 0 if there is a match of different positions of mtchString, -1 otherwise.
function match(item, mtchString) {
  const arr = [];
  arr.push(`${mtchString} `);
  arr.push(` ${mtchString} `);
  arr.push(` ${mtchString}.`);
  arr.push(` ${mtchString}-`);
  arr.push(`${mtchString}- `);
  arr.push(`-${mtchString} `);
  arr.push(`-${mtchString}`);
  arr.push(`-${mtchString}.`);
  arr.push(`${mtchString}:`);
  arr.push(` ${mtchString}:`);

  for(let i = 0; i < arr.length; i++) {
    if(item.indexOf(arr[i]) > -1) return 0; 
  }

  return -1;
}

function categorizeComments(comments) {
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
    else if((match(item,"beach") > -1) || 
       (match(item,"garden") > -1) || 
       (match(item,"market") > -1) || 
       (match(item,"activity") > -1) || 
       (match(item,"tower") > -1) || 
       (match(item,"castelo") > -1) || 
       (match(item,"wine tour") > -1) || 
       (match(item,"activities") > -1)) {
      taggedComments.activities.push(i);
    }
    // stay
    else if((match(item,"hotel") > -1) || 
            (match(item,"condo") > -1) || 
            (match(item,"airbnb") > -1) || 
            (match(item,"stay") > -1)) {
      taggedComments.stay.push(i);
    }
    // flight
    else if((match(item,"flight") > -1) || 
            (match(item,"flights") > -1) || 
            (match(item,"air") > -1) || 
            (match(item,"alaska") > -1) || 
            (match(item,"united") > -1) || 
            (match(item,"southwest") > -1) || 
            (match(item,"arrive at") > -1) || 
            (match(item,"arrives at") > -1) || 
            (match(item,"leave on") > -1) || 
            (match(item,"depart") > -1) || 
            (match(item,"delta") > -1)) {
      taggedComments.flight.push(i);
    }
    // car
    else if((match(item,"car") > -1) || 
            (match(item,"uber") > -1) || 
            (match(item,"suv") > -1)) {
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
  return categorizeComments(comments);
}

TripData.prototype.persistUpdatedTrip = function() {
  const file = tripFile.call(this);
  logger.debug(`persisting trip to file ${file}`);
  try {
    fs.writeFileSync(file, JSON.stringify(this.data));
    return true;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
    return false;
  }
}

// ======== Encode =======
// TODO: Figure out a way to get rid of the use of this function by other files (session.js, weather-info-provider.js)
TripData.encode = function(name) {
  return myEncode(name);
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
  if(visaRequirements[this.data.country]) this.data.todoList.push(visaRequirements[this.data.country]);
}

function tripFile() {
  // TODO: check parameters
  // can't use this.data because it is populated with the file contents, which might not exist yet.
  return `${tripBaseDir}/${filename.call(this)}`;
}

TripData.prototype.markTodoItemDone = function(doneItem) {
  const doneItemLc = doneItem.toLowerCase();
  if(!this.data.todoList) return; 
  if(!this.data.todoDoneList) this.data.todoDoneList = [];
  for(let idx = 0; idx < this.data.todoList.length; idx++) {
    if(this.data.todoList[idx].toLowerCase() === doneItemLc)  {
      this.data.todoDoneList.push(doneItem);
      this.data.todoList.splice(idx, 1);
      this.persistUpdatedTrip();
      return;
    }
  }
  logger.warn(`markTodoItemDone: Could not find item ${doneItem} in todo list`);
  return;
}

TripData.prototype.getTodoList = function() {
  return this.data.todoList;
}

TripData.prototype.getTodoDoneList = function() {
  return this.data.todoDoneList;
}

TripData.prototype.tripDataFile = function() {
  return `${tripBaseDir}/${this.data.name}-data.txt`;
}

TripData.prototype.tripItinFile = function() {
  return `${tripBaseDir}/${this.data.name}-itinerary.txt`;
}

TripData.prototype.boardingPassFile = function() {
  return `${tripBaseDir}/${this.data.name}-boarding-pass.txt`;
}

TripData.prototype.archiveBoardingPassFile = function() {
  return `${tripBaseDir}/oldFiles/${this.data.name}-boarding-pass.txt`;
}

TripData.prototype.boardingPassImage = function() {
  return `${tripBaseDir}/${this.data.name}-boarding-pass-image.png`;
}

function filename() {
  return `${myEncode(this.rawTripName)}.txt`;
}

/**************** TESTING APIs ********************/
TripData.prototype.testing_delete = function() {
  fs.readdirSync(tripBaseDir).forEach(file => {
    if(!file.includes(this.data.name)) return;
    logger.debug(`moving file ${file} to oldFiles`);
    fs.renameSync(`${tripBaseDir}/${file}`, `${tripBaseDir}/oldFiles/${file}`);
  });
}

TripData.prototype.testing_categorizeComments = categorizeComments;

/**************** TESTING APIs ********************/

module.exports = TripData;
