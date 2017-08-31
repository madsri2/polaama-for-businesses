'use strict';
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const FbidHandler = require('fbid-handler/app/handler');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Country = require(`${baseDir}/country`);
const Encoder = require(`${baseDir}/encoder`);
const ItineraryFlightInfo = require('flight-details-parser/app/itinerary-flight-info');


// TODO: This is leaking data model to other classes. Fix this by moving all functionality that require this variable into a function in this class.
TripData.todo = "todoList";
TripData.eventBaseDir = `${baseDir}/trips/shared/events`;

function TripData(rawTripName, fbid, testFbidFile) {
  if(!rawTripName) throw new Error("TripData: Required parameter tripName is undefined");
  if(!fbid) throw new Error("required field fbid is missing");
  this.fbid = fbid;
  const encodedFbid = FbidHandler.get(testFbidFile).encode(fbid);
  if(!encodedFbid) throw new Error(`could not find encoded id for fbid ${fbid}. passed test file is ${testFbidFile}`);
  this.tripBaseDir = `${baseDir}/trips/${encodedFbid}`;
  if(!fs.existsSync(this.tripBaseDir)) fs.mkdirSync(this.tripBaseDir);
  this.rawTripName = rawTripName;
  this.tripName = myEncode(rawTripName);
  this.retrieveTripData();
  if(!Object.keys(this.data).length) {
    // New trip: update trip with information to be persisted later
    this.data.name = this.tripName;
    this.data.rawName = rawTripName;
  }
  else {
    if(this.data.country) this.country = new Country(this.data.country);
  }
	updateTripItineraries.call(this);
}

function updateTripItineraries() {
	getItinDetails.call(this, this.itineraryFile(), "flightItin");
  // logger.debug(`Now calling return flight itinerary`);
	getItinDetails.call(this, this.returnFlightFile(), "returnFlightItin");
}

function getItinDetails(file, key) {
	if(!fs.existsSync(file)) return;
	if(this[key]) {
		logger.debug(`getItinDetails: key ${key} already present. Doing nothing!`);
		return;
	}
	const data = JSON.parse(fs.readFileSync(file,'utf8'));
  // logger.debug(`getItinDetails: dump of data from file ${file}: ${JSON.stringify(data)}`);
  if(Object.keys(data).length === 0) {
    logger.error(`getItinDetails: Flight itinerary data in file ${file} is empty!`);
    return;
  }
	const options = {};
	options.pnr = data.pnr_number;
	options.names = [];
	data.passenger_info.forEach(item => {
		options.names.push(item.name);
	});
	options.flight_num = [];
	options.dep_code = [];
	options.dep_city = [];
	options.arr_code = [];
	options.arr_city = [];
	options.departure_time = [];
	options.arrival_time = [];
	options.flightInfo_travelClass = [];
	data.flight_info.forEach(item => {
		options.flight_num.push(item.flight_number);
		options.dep_code.push(item.departure_airport.airport_code);
		options.dep_city.push(item.departure_airport.city);
		options.arr_code.push(item.arrival_airport.airport_code);
		options.arr_city.push(item.arrival_airport.city);
		// logger.debug(`getItinDetails: departure time is ${item.flight_schedule.departure_time}`);
		options.departure_time.push(moment(new Date(item.flight_schedule.departure_time).toISOString()).format("YYYY-MM-DDTHH:mm"));
		options.arrival_time.push(item.flight_schedule.arrival_time);
		if(item.flight_schedule.boarding_time) {
			if(!options.boarding_time) options.boarding_time = [];
			options.boarding_time.push(item.flight_schedule.boarding_time);
		}
    if(item.travel_class) options.flightInfo_travelClass.push(item.travel_class); 
	});
	options.seats = [];
  options.passenger_travelClass = [];
	data.passenger_segment_info.forEach(item => {
		if(item.seat) options.seats.push(item.seat);
		if(item.seat_type) options.passenger_travelClass.push(item.seat_type);
	});
  /*
  // if the travel_class is present both in flight_info object and seat_type, seat_types' travel class takes precedence);
  if(options.travel_class.length === 0) options.travel_class = options.tc;
  delete options.tc;
  */
	options.total_price = data.total_price;
	this[key] = new ItineraryFlightInfo(options).get();
}

// ======== Retrieve from trip =======
TripData.prototype.getInfoFromTrip = function(tripKey) {
  const trip = this.data;
  if(!trip) return null;
  let file;
  switch(tripKey) {
    case "comments": file = "comments.json"; break;
    case "expenses": file = "expenses.json"; break;
  }
  const fileName = getNewLocationFile.call(this, file);
  if(fs.existsSync(fileName)) return JSON.parse(fs.readFileSync(fileName));
  // logger.info(`trip-data.js:getInfoFromTrip Key ${tripKey} has ${trip[tripKey].length} items; Destination is ${trip.country}`);
  // for backwards compatibility, check trips file and move data if needed.
  if(trip[tripKey]) {
    let info = [];
    info = moveLists(trip[tripKey], info);
    if(info) {
      fs.writeFileSync(fileName, JSON.stringify(info));
      delete trip[tripKey];
      this.persistUpdatedTrip();
      return info;
    }
  }
  return null;
}

TripData.prototype.getPackList = function() {
  // retrieve latest data
  this.retrieveTripData();
  const trip = this.data;
  const file = packListFile.call(this);
  let packList = (fs.existsSync(file)) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
  if(!packList) {
    packList = {};
    packList.toPack = [];
    packList.done = [];
  }
  // For backwards compatibility, look for pack-list in the trip file as well.
  if(trip.packList) {
    packList.toPack = moveLists(trip.packList.toPack, packList.toPack);
    packList.done = moveLists(trip.packList.done, packList.done);
    // update pack-list file if any data was obtained from the trip file. then, delete trip file.
    if(packList.toPack || packList.done) fs.writeFileSync(file, JSON.stringify(packList));
    delete trip.packList;
    this.persistUpdatedTrip();
  }
  if(!packList || (!packList.toPack && !packList.done) || (packList.toPack.length === 0 && packList.done.length === 0)) {
    logger.info(`Could not find packList for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  // if(packList.toPack) logger.info(`There are ${packList.toPack.length} to pack items in pack list`);
  // if(packList.done) logger.info(`There are ${packList.done.length} done items in pack list`);
  return packList;
}

TripData.prototype.retrieveTripData = function() {
  const file = tripFile.call(this);
  try {
    fs.accessSync(file, fs.F_OK);
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8')); 
      if(this.data.rawName) this.rawTripName = this.data.rawName;
      this.tripFilePresent = true;
    }
    catch(err) {
      logger.error(`error reading from file ${file}: ${err.stack}`);
    }
  }
  catch(err) {
      // logger.info(`File ${file} does not exist for trip ${this.tripName}. Creating empty this.data object so it can be filled elsewhere`);
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

TripData.prototype.getDestination = function() {
  return this.data.destination;
}

// ======= Store data =======
TripData.prototype.resetTripDetails = function(tripDetails) {
  if(tripDetails.destination) this.data.destination = tripDetails.destination;
  if(tripDetails.startDate) this.data.startDate = tripDetails.startDate;
  if(tripDetails.duration) this.data.duration = tripDetails.duration;
  this.persistUpdatedTrip();
}

TripData.prototype.addTripDetailsAndPersist = function(tripDetails) {
  this.data = {}; 
  this.data.name = this.tripName;
  this.data.rawName = this.rawTripName;
  if(!tripDetails.ownerId) throw new Error(`addTripDetailsAndPersist: Required field ownerId is missing in passed tripDetails parameter`);
  // TODO: This needs to be removed and the place where this is set should use persistDepartureCityAndCode to set the right values.
  if(tripDetails.leavingFrom) this.data.leavingFrom = myEncode(tripDetails.leavingFrom);
  // destination might be different from trip name. Also, destination might be city or country. That determination is made and appropriate values are set in destination-cities-workflow/app/workflow.js
  if(tripDetails.destination) this.data.destination = tripDetails.destination;
  // TODO: The date format needs to be identified and converted to the needed format.
  if(tripDetails.datetime) this.data.startDate = tripDetails.datetime;
  else if(tripDetails.startDate) this.data.startDate = tripDetails.startDate;
	let sdIso = null;
  if(this.data.startDate) {
    sdIso = new Date(this.data.startDate).toISOString();
    this.data.startDate = moment(sdIso).format("YYYY-MM-DD");
  }
  else this.data.startDate = "unknown";

  if(this.tripStarted()) this.data.tripStarted = true;
  this.addPortOfEntry(tripDetails.portOfEntry);
  // duration includes the start date, so subtract 1
  if(tripDetails.duration) {
    this.data.duration = tripDetails.duration;
		if(sdIso) this.data.returnDate = moment(sdIso).add(this.data.duration - 1,'days').format("YYYY-MM-DD");
		else logger.warn(`addTripDetailsAndPersist: Not setting returnDate because we only have duration ${duration} and no start date`);
  }
  else this.data.returnDate = "unknown";
  
  if(tripDetails.returnDate) this.data.returnDate = moment(new Date(tripDetails.returnDate).toISOString()).format("YYYY-MM-DD");
  // logger.debug(`addTripDetailsAndPersist: return date is ${tripDetails.returnDate}`);

  // the shared files are located in /home/ec2-user/trips/shared/aeXf/san_francisco
  this.data.ownerId = tripDetails.ownerId;

  // TODO: Get this information from weather API or the file persisted.
  this.data.weather = "sunny";
  createPackList.call(this);
  createTodoList.call(this);
  this.persistUpdatedTrip();
}

function getSharedBaseDir() {
  if(this.tripSharedFilesBaseDir) return this.tripSharedFilesBaseDir;
  if(!this.data.ownerId) {
    logger.error(`getSharedBaseDir: Expected field ownerId missing for trip ${this.tripName}. returning null value for shared directory.`);
    return null;
  }
  this.tripSharedFilesBaseDir = `${baseDir}/trips/shared/${this.data.ownerId}`;
  if(!fs.existsSync(this.tripSharedFilesBaseDir)) fs.mkdirSync(this.tripSharedFilesBaseDir);
  this.tripSharedFilesBaseDir = `${this.tripSharedFilesBaseDir}/${this.data.name}`;
  if(!fs.existsSync(this.tripSharedFilesBaseDir)) fs.mkdirSync(this.tripSharedFilesBaseDir);
  return this.tripSharedFilesBaseDir;
}

TripData.prototype.timezone = function() {
  return this.data.timezone;
}

TripData.prototype.addEvent = function(eventName) {
  if(!this.data.events) this.data.events = [];
  const encodedEventName = Encoder.encode(eventName);
  // make this function idempotent
  if(!this.data.events.includes(encodedEventName)) this.data.events.push(encodedEventName);
  this.persistUpdatedTrip();
}

TripData.prototype.getEvents = function() {
  return this.data.events;
}

TripData.prototype.setConferenceInContext = function(event) {
  const encEvent = Encoder.encode(event);
  if(!this.data.events) throw new Error(`setConferenceInContext: trip ${this.trip.tripName} does not have any event. Call addEvent to add event before setting it as context`);
  if(!this.data.events.includes(encEvent)) throw new Error(`setConferenceInContext: Attempted to add a conference ${event} that was not added to trip ${this.tripName}; events in this trip are ${this.data.events}. Call addEvents to add conference ${encEvent} to events before setting it`);
  this.data.eventInContext = encEvent;
  this.persistUpdatedTrip();
}

TripData.prototype.getConferenceInContext = function() {
  return this.data.eventInContext;
}

TripData.prototype.tripStarted = function() {
  if(!this.data.startDate || this.data.startDate === "unknown") {
    logger.error(`tripStarted: startDate not present. Unable to find out if trip started or not`);
    return null; // This might be construed as "trip not yet started" by the caller.
  }
  // logger.debug(`start date: ${this.data.startDate}`);
  // the trip has started if today comes after the trips start date (to the hour's granularity);
  if(moment().isAfter(this.data.startDate, "hour")) return true;
  return false;
}

// Set the correct departure city (leavingFrom) for this trip. Users might have passed an airport code or city. Figure out which and store it accordingly.
TripData.prototype.persistDepartureCityAndCode = function(city, code) {
  this.data.leavingFrom = myEncode(city); 
  this.data.departureCityCode = code.toUpperCase();
  this.persistUpdatedTrip();
}

TripData.prototype.setCountry = function(country) {
  this.data.country = myEncode(country);
  this.country = new Country(country);
  this.persistUpdatedTrip();
}

TripData.prototype.setReturnDate = function(date) {
	const dateAsMoment = moment(new Date(date).toISOString());
	// see if return date matches passed date. if not, atleast log an error and return an error
	if(this.data.returnDate && this.data.returnDate !== "unknown") { 
		const returnDateAsMoment = moment(this.data.returnDate);
		if(returnDateAsMoment.isSame(dateAsMoment)) logger.info(`setReturnDate: returnDate is already set and the same as passed date ${date}. Doing nothing.`);
		else logger.error(`setReturnDate: return date is already set with value ${returnDateAsMoment} and is different from passed date ${date}. This is a POSSIBLE BUG: ${new Error().stack}`);
		return;
	}
	this.data.returnDate = dateAsMoment.format("YYYY-MM-DD");
	this.data.duration = dateAsMoment.diff(this.data.startDate, 'days') + 1;
	logger.debug(`setReturnDate: Set return date ${this.data.returnDate} and duration ${this.data.duration} days to trip ${this.data.name}`);
	this.persistUpdatedTrip();
}

TripData.prototype.addPortOfEntry = function(portOfEntry) {
  // this is needed for getting flight details.
  if(portOfEntry) this.data.portOfEntry = myEncode(portOfEntry);
  // else return logger.warn("addPortOfEntry: passed value portOfEntry is undefined. doing nothing!");
  else return;
	if(!this.data.cities) this.data.cities = [];
  this.data.cities.push(myEncode(portOfEntry));
	// logger.debug(`addPortOfEntry: Added ${portOfEntry} as port of entry`);
  this.persistUpdatedTrip();
}

TripData.prototype.addPortOfEntryAndCode = function(city, code) {
  this.data.portOfEntry = myEncode(city);
  this.data.portOfEntryCode = code.toUpperCase();
  this.persistUpdatedTrip();
}

// compare the port of entry with the passed city. This is a separate function to ensure that the encoding of portOfEntry does not leak outside this file.
TripData.prototype.comparePortOfEntry = function(city) {
  // logger.debug(`comparePortOfEntry: comparing ${this.data.portOfEntry} with ${myEncode(city)}`);
  if(this.data.portOfEntry && (this.data.portOfEntry === myEncode(city))) return true;
  // logger.debug(`comparePortOfEntry: No match`);
  return false;
}

TripData.prototype.isLeavingFrom = function(city) {
  const encCity = myEncode(city);
  logger.debug(`isLeavingFrom: comparing ${this.data.leavingFrom} with ${encCity}`);
  return (this.data.leavingFrom && (this.data.leavingFrom === encCity));
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
  // logger.debug(`addCityItinerary: City itinerary is ${JSON.stringify(this.data.cityItin)}`);
  // logger.debug(`addCityItinerary: City list is ${this.data.cities}`);
  this.persistUpdatedTrip();
}

TripData.prototype.cityItinDefined = function() {
  return (this.data.cityItin) ? true : false;
}

function todoFile() {
  const sharedBaseDir = getSharedBaseDir.call(this);
  if(!sharedBaseDir) return null;
  return `${sharedBaseDir}/todo_list.json`;
}

TripData.prototype.storeTodoList = function(senderId, messageText) {
  const regex = new RegExp("^todo[:]*[ ]*","i"); // ignore case
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  let todoList;
  const file = todoFile.call(this);
  logger.debug(`storetodoList: file is ${file}`);
  if(fs.existsSync(file)) todoList = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(!todoList) {
    todoList = {};
    todoList.todo = [];
    todoList.done = [];
  }
  todoList.todo = todoList.todo.concat(items);
  // store it locally
  try {
    fs.writeFileSync(file, JSON.stringify(todoList));
    return `Saved! You can retrieve this by saying get todo list`;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
  }
  logger.info(`successfully stored item ${items} in packList's toPack list`);
  return `Even bots need to eat! Be back in a bit.`;
}

function packListFile() {
  return `${getSharedBaseDir.call(this)}/pack_list.json`;
}

TripData.prototype.storePackList = function(messageText) {
  const regex = new RegExp("^pack[:]*[ ]*","i"); // ignore case
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  let packList;
  const file = packListFile.call(this);
  // logger.debug(`storePackList: file is ${file}`);
  if(fs.existsSync(file)) packList = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(!packList) {
    packList = {};
    packList.toPack = [];
    packList.done = [];
  }
  packList.toPack = packList.toPack.concat(items);
  // store it locally
  try {
    fs.writeFileSync(file, JSON.stringify(packList));
    return `Saved! You can retrieve this by saying get pack list`;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
  }
  // logger.info(`successfully stored item ${items} in packList's toPack list`);
  return `Even bots need to eat! Be back in a bit.`;
}

/*
 * Store whatever string the user input and return "Saved!"
 */
TripData.prototype.storeFreeFormText = function(senderId, messageText) {
  const regex = new RegExp("^save:?[ ]*","i"); // ignore case
  // retrieve text
  const items = messageText.replace(regex,"").split(',');
  let comments;
  const file = commentsFile.call(this);
  if(fs.existsSync(file)) comments = JSON.parse(fs.readFileSync(file, 'utf8'));
  if(!comments) comments = [];
  comments = comments.concat(items);
  // store it locally
  try {
    fs.writeFileSync(file, JSON.stringify(comments));
    return `Saved! You can retrieve this by saying 'get comments' or 'retrieve' list`;
  }
  catch(err) {
    logger.error(`error writing to file ${file}: ${err.stack}`);
  }
  return `Even bots need to eat! Be back in a bit.`;
}

function expensesFile() {
  return `${getSharedBaseDir.call(this)}/expenses.json`;
}

TripData.prototype.storeExpenseEntry = function(senderId, messageText) {
  const regex = new RegExp("^expense(-report)?:?[ ]*","i"); // ignore case
  const items = messageText.replace(regex,"").split(',');
  let expenses = this.getInfoFromTrip("expenses"); 
  if(!expenses) expenses = [];
  expenses = expenses.concat(items);
  const file = expensesFile.call(this);
  try {
    fs.writeFileSync(file, JSON.stringify(expenses));
    return `Saved! You can retrieve this by saying 'expenses' or 'get expenses'`;
  }
  catch(err) {
    logger.error(`error writing to file ${file}: ${err.stack}`);
  }
  return `Even bots need to eat! Be back in a bit.`;
}

TripData.prototype.userInputItinFile = function() {
  let file = getNewLocationFile.call(this, `${this.data.name}-user-itinerary.json`);
  if(fs.existsSync(file)) return file;
  return getNewLocationFile.call(this, `${this.data.name}-user-itinerary.txt`);
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
  if(!comments || !Object.keys(comments).length) {
    // logger.warn(`No comments found for trip ${this.tripName}. Returning empty list`);
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

function commentsFile() {
  return `${getSharedBaseDir.call(this)}/comments.json`;
}

TripData.prototype.parseComments = function() {
  const comments = this.getInfoFromTrip("comments"); 
  if(!comments || comments.length === 0) {
    // logger.info(`Could not find comments for trip ${this.data.name} in trip object or file ${file}. Returning empty object`);
    return {};
  }
  // logger.debug(`parseComments: found ${comments.length} comments for trip ${this.data.name}. Categorizing them`);
  return categorizeComments(comments);
}

TripData.prototype.persistUpdatedTrip = function() {
  const file = tripFile.call(this);
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
  // if the pack file already exists, then do nothing.
  const file = packListFile.call(this);
  if(fs.existsSync(file)) return;
  // if the weather is sunny, add corresponding items.
  switch(this.data.weather) {
    case "sunny": 
      this.storePackList("A hat, Sunglasses, Sunscreen lotion");
      break;
    case "rainy":
      this.storePackList("Rain Jacket, Gloves");
      break;
    case "cold":
      this.storePackList("Winter coat, Gloves");
      break;
  }
  this.storePackList("Travel adapter");
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
  if(this.data.country && this.data.country !== "usa" && this.data.country !== "united_states" && this.data.country !== "us") this.data.todoList.push("[US Citizens only] Enroll in STEP (https://step.state.gov/step/) to get travel alerts and warnings.");
  if(visaRequirements[this.data.country]) this.data.todoList.push(visaRequirements[this.data.country]);
}

function tripFile() {
  // TODO: check parameters
  // can't use this.data because it is populated with the file contents, which might not exist yet.
  return `${this.tripBaseDir}/${filename.call(this)}`;
}

// TODO: test this
TripData.prototype.markTodoItemDone = function(doneItem) {
  const doneItemLc = doneItem.toLowerCase();
  const todoList = this.getTodoList();
  if(!todoList) return; 
  for(let idx = 0; idx < todoList.todo.length; idx++) {
    if(todoList.todo[idx].toLowerCase() === doneItemLc)  {
      todoList.done.push(doneItem);
      todoList.todo.splice(idx, 1);
      // persist this to the right file
      const file = todoFile.call(this);
      fs.writeFileSync(file, JSON.stringify(todoList));
      return;
    }
  }
  logger.warn(`markTodoItemDone: Could not find item ${doneItem} in todo list`);
  return;
}

function moveLists(items, target) {
  if(!items) return target;
  if(!target) return items;
  items.forEach(item => {
    if(!target.includes(item)) target.push(item);
  });
  return target;
}

TripData.prototype.getTodoList = function() {
  const file = todoFile.call(this);
  if(!file) return {};
  let todoList = (fs.existsSync(file)) ? JSON.parse(fs.readFileSync(file, 'utf8')) : undefined;
  if(!todoList) {
    todoList = {};
    todoList.todo = [];
    todoList.done = [];
  }
  // retrieve latest data
  this.retrieveTripData();
  const trip = this.data;
  // For backwards compatibility, look for pack-list in the trip file as well.
  if(trip.todoList || trip.todoDoneList) {
    if(trip.todoList) {
      todoList.todo = moveLists(trip.todoList, todoList.todo);
      delete trip.todoList;
    }
    if(trip.todoDoneList) {
      todoList.done = moveLists(trip.todoDoneList, todoList.done);
      delete trip.todoDoneList;
    }
    // update pack-list file if any data was obtained from the trip file. then, delete trip file.
    fs.writeFileSync(file, JSON.stringify(todoList));
    this.persistUpdatedTrip();
  }
  if(!todoList || (!todoList.todo && !todoList.done) || (todoList.todo.length === 0 && todoList.done.length === 0)) {
    logger.info(`Could not find todoList for trip ${this.data.name}. Returning empty object`);
    return {};
  }
  // if(todoList.todo) logger.info(`There are ${todoList.todo.length} to pack items in todo list`);
  // if(todoList.done) logger.info(`There are ${todoList.done.length} done items in todo list`);
  return todoList;
}

TripData.prototype.getTodoDoneList = function() {
  return this.data.todoDoneList;
}

TripData.prototype.tripDataFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-data.txt`;
}

TripData.prototype.tripItinFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-itinerary.txt`;
}

TripData.prototype.boardingPassFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-boarding-pass.txt`;
}

TripData.prototype.itineraryFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-flight-itinerary.txt`;
}

TripData.prototype.getNAPFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-next-activity-pointers.json`;
}

TripData.prototype.getNAPEstimatesFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-nap-estimates.json`;
}

TripData.prototype.runningTrailFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-running-trails.json`;
}

TripData.prototype.airportToHotelFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-airport-to-hotel.json`;
}

TripData.prototype.hotelToAirportFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-hotel-to-airport.json`;
}

TripData.prototype.walkingToursFile = function(location) {
  const city = (location) ? `${location}-` : "";
  return `${this.tripBaseDir}/${this.data.name}-${city}walking-tours.json`;
}

TripData.prototype.vegRestaurantsFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-vegetarian-restaurants.json`;
}

function getNewLocationFile(fileName) {
  if(!fileName) throw new Error("getNewLocationFile: required parameter filename is not defined");
  const file = `${getSharedBaseDir.call(this)}/${fileName}`;
  // logger.debug(`getNewLocationFile: file is ${file}`);
  if(fs.existsSync(file)) return file;
  // for backwards compatibility, look at the old location and if the file exists, move it to the new location.
  const oldLocation = `${this.tripBaseDir}/${fileName}`;
  if(fs.existsSync(oldLocation)) {
    logger.debug(`itemImageFile: renaming old file ${oldLocation} to new file ${file}`);
    fs.renameSync(oldLocation, file);
  }
  // TODO: This might fail. Hopefully, it will be handled correctly upstream.
  // logger.debug(`getNewLocationFile: returning file ${file}`);
  return file;
}

TripData.prototype.eventDetailsFile = function(eventName, file) {
  // see if the event exists. if not, return;
  if(!this.eventItineraryFile(eventName)) return null;
  return `${TripData.eventBaseDir}/${Encoder.encode(eventName)}/${file}.json`;
}

TripData.prototype.eventItineraryFile = function(eventName) {
  if(!eventName) {
    const events = this.data.events;
    if(!events || events.length === 0) {
      logger.warn(`eventItineraryFile: no events present`);
      return null;
    }
    if(events.length > 1) {
      logger.warn(`eventItineraryFile: there are multiple events present: ${events}. Please pass the event name`);
      return null;
    }
    eventName = events[0];
  }
  const encEName = Encoder.encode(eventName);
  return `${TripData.eventBaseDir}/${encEName}/${encEName}-event-itinerary.json`;
}

TripData.prototype.dayItineraryFile = function(date) {
  const fileName = `${this.data.name}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-itinerary.json`;
  return getNewLocationFile.call(this, fileName);
}

TripData.prototype.itemDetailsFile = function(dateStr, fileSuffix) {
  const date = new Date(dateStr);
  const fileName = `${this.data.name}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${fileSuffix}.html`;
  return getNewLocationFile.call(this, fileName);
}

TripData.prototype.mapImageFile = function(dateStr) {
  const date = new Date(dateStr);
  // logger.debug(`mapImageFile: ${date}`);
  const fileName = `${this.data.name}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-map.png`;
  return getNewLocationFile.call(this, fileName);
}

TripData.prototype.itemImageFile = function(dateStr, item) {
  const date = new Date(dateStr);
  // logger.debug(`itemImageFile: ${date}; item: ${item}`);
  const fileName = `${this.data.name}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${item}.png`;
  return getNewLocationFile.call(this, fileName);
}

TripData.prototype.hotelChoiceFile = function(city) {
  return getNewLocationFile.call(this, `${city}-hotel-choices.json`);
}

TripData.prototype.lunchChoiceFile = function(city) {
  return getNewLocationFile.call(this, `${city}-lunch-choices.json`);
}

TripData.prototype.dayItinIndexFile = function(date) {
  return `${this.tripBaseDir}/${this.data.name}-${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-current-index.txt`;
}

TripData.prototype.returnFlightFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-return-flight.txt`;
}

TripData.prototype.rentalCarReceiptFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-rental-car-receipt.txt`;
}

TripData.prototype.updateReceiptDetails = function(rawTitle) {
  const title = myEncode(rawTitle);
  if(!this.data.receipts) this.data.receipts = [];
  // nothing to do if the title already exists.
  if(this.data.receipts.includes(title)) return;
  this.data.receipts.push(title);
  this.persistUpdatedTrip();
}

TripData.prototype.receipts = function() {
  // reload trips data
  this.retrieveTripData();
  return this.data.receipts;
}

TripData.prototype.receiptDetailsFile = function(title) {
  if(title) return `${this.tripBaseDir}/${this.data.name}-${myEncode(title)}-receipt.pdf`;
  return null;
}

TripData.prototype.generalReceiptFile = function(title) {
  if(title) return `${this.tripBaseDir}/${this.data.name}-${myEncode(title)}-receipt.txt`;
  return null;
  /*
  // reload trips data
  // read the data from file to make sure we don't miss anything.
  this.retrieveTripData();
  const receipts = [];
  if(!this.data.receipts) return null;
  this.data.receipts.forEach(receipt => {
    receipts.push(`${this.tripBaseDir}/${this.data.name}-${receipt}-receipt.txt`);
  });
  return receipts;
  */
}

TripData.prototype.getHotelReceiptDetails = function() {
  if(this.hotelReceiptDetails) return this.hotelReceiptDetails;
  const file = this.hotelRentalReceiptFile();
  // logger.debug(`getHotelReceiptDetails: hotel file is ${file}`);
  if(!fs.existsSync(file)) {
    this.hotelReceiptDetails = null;
    return null;
  }
  this.hotelReceiptDetails = JSON.parse(fs.readFileSync(this.hotelRentalReceiptFile(), 'utf8'));
  return this.hotelReceiptDetails;
}

TripData.prototype.hotelRentalReceiptFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-hotel-rental-receipt.txt`;
}

TripData.prototype.tripImageFile = function() {
  return `${this.tripBaseDir}/${this.data.name}-trip-image.json`;
}

TripData.prototype.archiveBoardingPassFile = function() {
  const dir = `${this.tripBaseDir}/oldFiles`;
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
  return `${dir}/${this.data.name}-boarding-pass.txt`;
}

TripData.prototype.boardingPassImage = function() {
  return `${this.tripBaseDir}/${this.data.name}-boarding-pass-image.png`;
}

TripData.prototype.copyFrom = function(trip) {
  const file = tripFile.call(trip);
  const toFile = tripFile.call(this);
  logger.debug(`copyFrom: trip dump ${JSON.stringify(trip)}; fromFile is ${file}. toFile is ${toFile}`);
  if(fs.existsSync(file)) fs.createReadStream(file).pipe(fs.createWriteStream(toFile));
  logger.debug(`copied ${toFile} from ${file}`);
  const dataFile = trip.tripDataFile();
  if(fs.existsSync(dataFile)) fs.createReadStream(dataFile).pipe(fs.createWriteStream(this.tripDataFile()));
  logger.debug(`copied ${this.tripDataFile()} from ${dataFile}`);
  const itinFile = trip.tripItinFile();
  if(fs.existsSync(itinFile)) fs.createReadStream(itinFile).pipe(fs.createWriteStream(this.tripItinFile()));
  logger.debug(`copied ${this.tripItinFile()} from ${itinFile}`);
}

function filename() {
  return `${myEncode(this.rawTripName)}.txt`;
}

/**************** TESTING APIs ********************/
TripData.prototype.testing_delete = function() {
  fs.readdirSync(this.tripBaseDir).forEach(file => {
    if(!file.includes(this.data.name)) return;
    // logger.debug(`moving file ${file} to oldFiles`);
    const targetDir = `${this.tripBaseDir}/oldFiles`;
    if(!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
    fs.renameSync(`${this.tripBaseDir}/${file}`, `${targetDir}/${file}`);
  });
  // Take care of shared files
	// logger.debug(`getting shared base dir for trip ${this.rawTripName} with owner ${this.data.ownerId}`);
  const sharedBaseDir = getSharedBaseDir.call(this, this.data.ownerId);
  // logger.debug(`sharedBaseDir: ${sharedBaseDir}`);
  if(!sharedBaseDir) return;
  fs.readdirSync(sharedBaseDir).forEach(file => {
    if(file.includes("oldFiles")) return;
    const targetDir = `${sharedBaseDir}/oldFiles`;
    if(!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);
    fs.renameSync(`${sharedBaseDir}/${file}`, `${targetDir}/${file}`);
  });
}

// TODO: Duplicates itineraryFile() & boardingPassFile. Fix the first time this causes an issue
TripData.testing_itineraryFile = function(encodedFbid, tripName) {
  const tripDir = `${baseDir}/trips/${encodedFbid}`;
  return `${tripDir}/${tripName}-flight-itinerary.txt`;
}

TripData.testing_boardingPassFile = function(encodedFbid, tripName) {
  const tripDir = `${baseDir}/trips/${encodedFbid}`;
  return `${tripDir}/${tripName}-boarding-pass.txt`;
}

TripData.testing_runningTrailFile = function(encodedFbid, tripName) {
  const tripDir = `${baseDir}/trips/${encodedFbid}`;
  return `${tripDir}/${tripName}-running-trails.json`;
}

TripData.prototype.testing_categorizeComments = categorizeComments;

/**************** TESTING APIs ********************/

module.exports = TripData;
