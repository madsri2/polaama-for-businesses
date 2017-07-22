'use strict';
const _ = require('lodash');
const request = require('request');
const logger = require('./my-logger');
const TripData = require('./trip-data');
const TripInfoProvider = require('./trip-info-provider');
const TripDataFormatter = require('./trip-data-formatter');
const Sessions = require('./sessions');
const moment = require('moment');
const FbidHandler = require('fbid-handler/app/handler');
const fs = require('fs');
const formidable = require('formidable');
const ExpenseReportFetcher = require('expense-report/app/report-fetcher');
const BrowseQuotes = require('trip-flights/app/browse-quotes');
const Commands = require('trip-itinerary/app/commands');

function WebpageHandler(id, tripName) {
  this.fbidHandler = FbidHandler.get();
  this.fbid = this.fbidHandler.decode(id);
  this.tripName = tripName;
  this.sessions = Sessions.get();
  this.session = this.sessions.find(this.fbid);
  if(_.isNull(this.session)) {
    logger.warn(`No session exists for id ${this.fbid}`);
    return;
  }
  if(_.isUndefined(tripName)) {
    // some functions below (like sendFriendsList & handleTravelersForNewTrip) don't require trip and formatter
    logger.info("WebpageHandler: tripName was not passed. Not getting any trip information");
    return;
  }
  this.trip = this.session.getTrip(tripName);
  if(!this.trip) {
    logger.error(`No trip named ${tripName} exists in session ${this.session.sessionId}`);
    return;
  }
  this.formatter = new TripDataFormatter(this.trip, this.fbid);
}

WebpageHandler.prototype.displayTrip = function(res) {
  const tip = new TripInfoProvider(this.trip, this.session.hometown);
  const html = res.send(this.formatter.formatTripDetails(
    tip.getStoredWeatherDetails(), tip.getStoredActivityDetails()));
}

WebpageHandler.prototype.displayPackList = function(res, args) {
  const headers = args[0];
  return res.send(this.formatter.formatPackList(headers));
}

WebpageHandler.prototype.displayTodoList = function(res, args) {
  const headers = args[0];
  return res.send(this.formatter.formatListResponse(headers, TripData.todo));
}

WebpageHandler.prototype.displayRawComments = function(res, args) {
  const headers = args[0];
  return res.send(this.formatter.formatListResponse(headers, "comments"));
}

WebpageHandler.prototype.displayComments = function(res) {
  return res.send(this.formatter.formatComments());
}

WebpageHandler.prototype.displayWeatherDetails = function(res) {
  const tip = new TripInfoProvider(this.trip, this.session.hometown);
  return res.send(this.formatter.formatWeatherDetails(
        tip.getStoredWeatherDetails(),
        tip.getStoredAdditionalWeatherDetails()));
}

WebpageHandler.prototype.displayActivityDetails = function(res) {
  const tip = new TripInfoProvider(this.trip, this.session.hometown);
  const activityDetails = tip.getStoredActivityDetails();
  return res.send(this.formatter.formatActivityDetails(activityDetails));
}

WebpageHandler.prototype.displayFlightDetails = function(res) {
  const tip = new TripInfoProvider(this.trip, this.session.hometown);
  const flightDetails = tip.getStoredFlightDetails();
  return res.send(this.formatter.formatFlightDetails(flightDetails));
}

WebpageHandler.prototype.displayFlightQuotes = function(req, res) {
  const trip = this.trip.data;
  const tip = new TripInfoProvider(this.trip, this.session.hometown);
  const promise = tip.getStoredFlightQuotes();
  const self = this;
  promise.done(
    function(contents) {
      if(contents.length === 0) return res.send(self.formatter.formatFlightQuotes({noflight: 'No information yet for this segment'}));
      return res.send(self.formatter.formatFlightQuotes(contents));
    },
    function(err) {
      logger.error(`Error getting flight quotes: ${err.stack}`);
      return res.send(self.formatter.formatFlightQuotes({noflight: 'No information yet for this segment'}));
    }
  );
}

WebpageHandler.prototype.displayExpenseReport = function(res) {
  const reporter = new ExpenseReportFetcher(this.trip);
  const report = reporter.getReport();
  if(report.noreport) {
    return res.send(report.noreport);
  }
  return res.send(this.formatter.formatExpensePage(report));
}

WebpageHandler.prototype.displayCalendar = function(res) {
  try {
    return res.send(this.formatter.displayCalendar(this.session.hometown));
  }
  catch(e) {
    logger.error(`displayCalendar: Error formatting calendar view; ${e.stack}`);
    return res.send(`Unable to show itinerary for trip ${this.tripName} at this time`);
  }
}

WebpageHandler.prototype.myDayPlan = function(res, args) {
  let html = require('fs').readFileSync(`html-templates/my-day-plan.html`, 'utf8');
  html = html.replace("${date}", "6/11/17")
            .replace("${city}", "Tel Aviv")
            .replace("${plan}", "Some plan");
  return res.send(html);
}

WebpageHandler.prototype.dayPlan = function(res, args) {
  const date = args[0];
  try {
    const commands = new Commands(this.trip, this.session.fbid, true /* sendHtml */);
    return res.send(commands.handle(date));
  }
  catch(e) {
    logger.error(`dayPlans: Error planning for tomorrow; ${e.stack}`);
    return res.send(`Unable to show day plan for trip ${this.tripName} and date ${date} at this time`);
  }
}

/*
This function serves as the entry point for all other functions. Callback will be one of the functions above. The args array is to handle cases where some functions require more than 1 argument (like displayRawComments above).
*/ 
WebpageHandler.prototype.handleWebpage = function(res, callback, args) {
  if(_.isNull(this.session)) {
    logger.error(`handleWebPage: No session exists ${(new Error()).stack}`);
    return res.send("Invalid request.");
  }
  if(_.isNull(this.trip)) {
    return res.send(`You don't yet have a trip named ${this.tripName}. Create one by clicking on "New Trip" in the hamburger menu.`);
  }
  return callback.call(this, res, args);
}

WebpageHandler.prototype.sendFriendsList = function(res) {
  // for this user's fbid, get the list of friends, update the html template with that and then send it.
  if(_.isNull(this.session)) {
    logger.error("sendFriendsList: There is no session corresponding to this request");
    return res.send("Cannot add trip to your friend's travel list because Polaama does not know about them yet.");
  }
  const new_trip = fs.readFileSync("html-templates/new-trip-template.html", 'utf8');
  const friends = this.fbidHandler.getFriends(this.session.fbid);
  let cbox = "";
  friends.forEach(id => {
      const name = this.fbidHandler.getName(id);
      cbox += `<input type="checkbox" name="${name}" value="${name}">${name}<br>`;
      });
  const html = new_trip.replace("${friendsList}", cbox);
  return res.send(html);
}

function addTravelers(err, fields) {
  if(err) {
    logger.error(`Error from form parser: ${JSON.stringify(err)}`);
    return "rror updating itinerary";
  }
  logger.info("handleTravelersForNewTrip: The friends chosen are: " + JSON.stringify(fields));
  let noSessionForFriend = false;
  let addingToSessionFailed = false;
  // For each friend who is traveling, add this trip in their session.
  Object.keys(fields).forEach(name => {
    const friendFbid = this.fbidHandler.fbid(name);
    logger.info(`Obtained id ${friendFbid} for friend ${name}`);
    const friendSession = this.sessions.find(friendFbid);
    if(!friendSession) {
      logger.error(`addTravelers: Could not find session for id ${friendFbid}, friend ${name}`);
      noSessionForFriend = true;
      return;
    }
    // add new trip to friends' session, but do not change context of that session
    try {
      friendSession.addNewTrip(this.session.tripNameInContext, this.trip);
    }
    catch(err) {
      logger.error(`addTravelers: error adding new trip ${this.trip.rawTripName} to session ${friendSession.sessionId} from localSession ${this.session.sessionId}: ${err.stack}`);
      addingToSessionFailed = true;
    }
  });
  if(noSessionForFriend) return "Could not add this trip to some of your friend's travel list because Polaama does not know about them yet.";
  if(addingToSessionFailed) return "Could not add this trip to your friend's travel list. Please try again later";
  return "saved trips to friends' list";
}

WebpageHandler.prototype.handleCarReceipt = function(req, res) {
	try {
    const form = new formidable.IncomingForm(); 
    const self = this;
    form.parse(req, function (err, fields, files) {
  		const values = fields['text-basic'].split(',');
  		let options = {};
  		values.forEach(v => {
  			const arr = v.split('=');
  			const key = arr[0].replace(/\s+/g, '');
  			options[key] = arr[1];
  		});
      logger.debug(`passed fields are ${JSON.stringify(options)}`);
			const CarRentalManager = require('car-rental-details/app/itinerary-handler');
  		const crm = new CarRentalManager(options);
  		crm.handle();
      return res.send("Successfully handled car receipt email and sent notification to user");
    }); 
	}
	catch(e) {
		logger.error(`handleCarReceipt: error in parsing form: ${e.stack}`);
		return res.send(`handleCarReceipt: error in parsing form: ${e.stack}. passed options ${JSON.stringify(options)}`);
	}
}

WebpageHandler.prototype.handleHotelReceipt = function(req, res) {
	try {
    const form = new formidable.IncomingForm(); 
    const self = this;
    form.parse(req, function (err, fields, files) {
  		const values = fields['text-basic'].split(',');
  		let options = {};
  		values.forEach(v => {
  			const arr = v.split('=');
  			const key = arr[0].replace(/\s+/g, '');
  			options[key] = arr[1];
  		});
      logger.debug(`passed fields are ${JSON.stringify(options)}`);
			const HotelReceiptManager = require('receipt-manager/app/hotel-receipt-manager');
  		const crm = new HotelReceiptManager(options);
  		crm.handle();
      return res.send("Successfully handled hotel receipt email and sent notification to user");
    }); 
	}
	catch(e) {
		logger.error(`handleHotelReceipt: error in parsing form: ${e.stack}`);
		return res.send(`handleHotelReceipt: error in parsing form: ${e.stack}. passed options ${JSON.stringify(options)}`);
	}
}

WebpageHandler.prototype.handleFlightItinerary = function(req, res) {
  if(_.isNull(this.session)) {
    logger.error("There is no session corresponding to this request.");
    return res.send("Error handling flight itinerary without session");
  }
	try {
  const form = new formidable.IncomingForm(); 
  const self = this;
  form.parse(req, function (err, fields, files) {
		const values = fields['text-basic'].split(',');
		let options = {};
		values.forEach(v => {
			const arr = v.split('=');
			const key = arr[0].replace(/\s+/g, '');
			if(key === 'names' || key === 'flight_num') {
				options[key] = []; options[key].push(arr[1]);	
			}
			else options[key] = arr[1];
		});
    logger.debug(`passed fields are ${JSON.stringify(options)}`);
		// set the flightNum_seats option
		options.names.forEach((name, pIdx) => {
			options.flight_num.forEach((num,idx) => {
				const key = `${num}_seats`;
				if(!options[key]) options[key] = [];
				options[key].push(options.seats[pIdx]);
			});
		});
		delete options.seats;
		console.log(`options: ${JSON.stringify(options)}`);
		const ItineraryHandler = require('flight-details-parser/app/itinerary-handler');
		const itinHandler = new ItineraryHandler(options);
		itinHandler.handle();
    return res.send("Successfully handled itinerary email and sent notification to user");
  }); 
	}
	catch(e) {
		logger.error(`handleFlightItinerary: error in parsing form: ${e.stack}`);
		return res.send(`handleFlightItinerary: error in parsing form: ${e.stack}. passed options ${JSON.stringify(options)}`);
	}
}

WebpageHandler.prototype.handleTravelersForNewTrip = function(req, res) {
  // logger.info(`body: ${JSON.stringify(req.body)}; params: ${JSON.stringify(req.params)}, query-string: ${JSON.stringify(req.query)} headers: ${JSON.stringify(req.headers)}`);
  // logger.info("req value is " + util.inspect(req, {showHidden: true, color: true, depth: 5}));
  if(_.isNull(this.session)) {
    logger.error("There is no session corresponding to this request.");
    return res.send("Cannot add trip to your friend travel list because Polaama does not know about them yet.");
  }
  const form = new formidable.IncomingForm(); 
  const self = this;
  if(_.isUndefined(localSession.tripNameInContext)) {
    return res.send(`Could not add trip to friends' list because there is no trip in context for ${this.session.fbid}.`);
  }
  form.parse(req, function (err, fields, files) {
    return res.send(addTravelers.call(self, err, fields));
  }); 
}

WebpageHandler.prototype.displayCities = function(res) {
  return res.send(this.formatter.formatCities());
}

WebpageHandler.prototype.displayCitiesForExistingTrip = function(res) {
  return res.send(this.formatter.addCitiesExistingTrip());
}

WebpageHandler.prototype.saveItinUpdate = function(req, res) {
  const form = new formidable.IncomingForm(); 
  const self = this;
  // All activities need to happen within the the form.parse function
  form.parse(req, function(err, fields, files) {
    if(err) {
      logger.error(`Error from parser: ${JSON.stringify(err)}`);
      return res.send(`Error updating itinerary`);
    }
    logger.debug(`saveItinUpdate: fields in form: ${JSON.stringify(fields)}; params: ${req.params.tripName}`);
    // store itinerary in the date corresponding to when it was entered
    if(!fields.date || !fields.value) {
      logger.error(`saveItinUpdate: Either "date or "value" field is missing in form. Cannot proceed`);
      return res.send(`Error updating itinerary`);
    }
    self.trip.updateItinerary(fields.date, fields.value).then(
      function(r) {
        logger.debug(`saveItinUpdate: successfully updated itinerary. return from updateItinerary: ${r}`);
        return res.send(r);
      },
      function(e) {
        logger.error(`saveItinUpdate: Error calling updateItinerary: ${e.stack}`);
        return res.send("Error updating itinerary");
      }
    );
  });
}

WebpageHandler.prototype.handleControlGroup = function(req, res) {
  const form = new formidable.IncomingForm(); 
  // All activities need to happen within the the form.parse function
  form.parse(req, function(err, fields, files) {
    if(err) {
      console.log(`Error from parser: ${JSON.stringify(err)}`);
      return res.send(`error from parser: ${JSON.stringify(err)}`);
    }
   console.log(`Fields in form are : ${JSON.stringify(fields)}`);
    return res.send(`Fields in form are ${JSON.stringify(fields)}`);
  });
}

function formParseCallback(err, fields, files, res, existingTrip) {
  if(_.isUndefined(fields.cities)) {
    return res.send("No cities added.");
  }
  // convert field.cities into an array
  const c = [];
  const cities = c.concat(fields.cities);
  this.session.tripData().addCityItinerary(fields.cities, fields.numberOfDays);

  const portOfEntry = cities[0];
  if(!existingTrip) {
    // new trip. So, add port of entry
    if(!portOfEntry) {
      logger.error(`formParseCallback: port of entry is undefined`);
      return res.send(`Required field port of entry is undefined. Cannot proceed!`);
    }
    this.session.tripData().addPortOfEntry(portOfEntry);
  }
  else {
    logger.info(`formParseCallback: This is an existing trip. Not adding port of entry`);
  }
  logger.debug(`formParseCallback: The cities chosen for trip ${this.session.tripNameInContext} are: ${JSON.stringify(cities)}. portOfEntry is ${portOfEntry}`);
  this.canProceed = true;
  return res.send(this.formatter.formatCityChoicePage());
}

WebpageHandler.prototype.handleAddCityChoice = function(req, res, postHandler, existingTrip) {
  // store the chosen cities in the trip, persist it and return success.
  if(_.isNull(this.session)) {
    logger.error("There is no session corresponding to this request.");
    return res.send("Cannot add cities because Polaama does not have your session details");
  }
  const form = new formidable.IncomingForm(); 
  // All activities need to happen within the the form.parse function
  const callback = formParseCallback.bind(this);
  const self = this;

  form.parse(req, function(err, fields, files) {
    logger.debug(`handleAddCityChoice cities: ${JSON.stringify(fields)}`);
    callback(err, fields, files, res, existingTrip);
    if(self.canProceed) {
      postHandler.startPlanningTrip();
    }
  });
}

WebpageHandler.prototype.getBoardingPass = function(req, res) {
  const file = this.trip.boardingPassImage();
  try {
    fs.accessSync(file);
  }
  catch(e) {
    logger.error(`getBoardingPass: error accessing file ${file}: ${e.stack}`);
    return res.sendStatus(404);
  }
  logger.debug(`getBoardingPass: returning file ${file}`);
  return res.sendFile(file);
}

WebpageHandler.prototype.getReceiptDetails = function(res, receiptFile) {
  const file = this.trip.receiptDetailsFile(receiptFile);
  return res.sendFile(file, null, 
    function(e) {
      if(e) {
        logger.error(`getReceiptDetails: could not return file ${file}: ${e.stack}`);
         return res.status(404).send("Could not retrieve item details at this time");
      }
    });
}

WebpageHandler.prototype.getItemDetails = function(res, date, itemFile) {
  const file = this.trip.itemDetailsFile(date, itemFile);
  return res.sendFile(file, null, 
    function(e) {
      if(e) {
        logger.error(`getItemDetails: could not return file ${file}: ${e.stack}`);
         return res.status(404).send("Could not retrieve item details at this time");
      }
    });
}

WebpageHandler.prototype.getMap = function(res, date) {
  const file = this.trip.mapImageFile(date);
  return res.sendFile(file, null, 
    function(e) {
      if(e) {
        logger.error(`getMap: could not return file ${file}: ${e.stack}`);
         return res.status(404).send("Could not retrieve map image at this time");
      }
  });
}

WebpageHandler.prototype.getItemImage = function(res, date, item) {
  const file = this.trip.itemImageFile(date, item);
  return res.sendFile(file, null, 
    function(e) {
      if(e) {
        logger.error(`getItemDetails: could not return file ${file}: ${e.stack}`);
         return res.status(404).send("Could not retrieve map image at this time");
      }
  });
}

WebpageHandler.prototype.testing_addTravelers = addTravelers;

module.exports = WebpageHandler;
