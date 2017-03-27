'use strict';
const _ = require('lodash');
const request = require('request');
const logger = require('./my-logger');
const TripData = require('./trip-data');
const TripInfoProvider = require('./trip-info-provider');
const TripDataFormatter = require('./trip-data-formatter');
const Sessions = require('./sessions');
const moment = require('moment');
const FbidHandler = require('./fbid-handler');
const fs = require('fs');
const formidable = require('formidable');
const ExpenseReportFetcher = require('./expense-report/app/report-fetcher');

function WebpageHandler(id, tripName) {
  this.fbidHandler = new FbidHandler();
  this.fbid = this.fbidHandler.decode(id);
  this.tripName = tripName;
  this.sessions = new Sessions();
  this.session = this.sessions.find(this.fbid);
  if(_.isNull(this.session)) {
    logger.error(`No session exists for id ${this.fbid}`);
    return;
  }
  if(_.isUndefined(tripName)) {
    // some functions below (like sendFriendsList & handleTravelersForNewTrip) don't require trip and formatter
    logger.info("WebpageHandler: tripName was not passed. Not getting any trip information");
    return;
  }
  this.trip = this.session.getTrip(tripName);
  if(_.isNull(this.trip)) {
    logger.error(`No trip named ${tripName} exists in session ${this.session.sessionId}`);
    return;
  }
  this.formatter = new TripDataFormatter(this.trip);
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

WebpageHandler.prototype.displayExpenseReport = function(res) {
  const reporter = new ExpenseReportFetcher(this.tripName);
  const report = reporter.getReport();
  if(report.noreport) {
    return res.send(report.noreport);
  }
  return res.send(this.formatter.formatExpensePage(report));
}

WebpageHandler.prototype.displayCalendar = function(res) {
  return res.send(this.formatter.displayCalendar());
}

/*
This function serves as the entry point for all other functions. Callback will be one of the functions above. The args array is to handle cases where some functions require more than 1 argument (like displayRawComments above).
*/ 
WebpageHandler.prototype.handleWebpage = function(res, callback, args) {
  if(_.isNull(this.session)) {
    logger.error("handleWebPage: No session exists");
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

WebpageHandler.prototype.handleTravelersForNewTrip = function(req, res) {
  // logger.info(`body: ${JSON.stringify(req.body)}; params: ${JSON.stringify(req.params)}, query-string: ${JSON.stringify(req.query)} headers: ${JSON.stringify(req.headers)}`);
  // logger.info("req value is " + util.inspect(req, {showHidden: true, color: true, depth: 5}));
  if(_.isNull(this.session)) {
    logger.error("There is no session corresponding to this request.");
    return res.send("Cannot add trip to your friend travel list because Polaama does not know about them yet.");
  }
  const form = new formidable.IncomingForm(); 
  const localFbidHandler = this.fbidHandler;
  const localSessions = this.sessions;
  const localSession = this.session;
  const localFormatter = this.formatter;
  if(_.isUndefined(localSession.tripNameInContext)) {
    return res.send(`Could not add trip to friends' list because there is no trip in context for ${this.session.fbid}.`);
  }
  let noSessionForFriend = false;
  form.parse(req, function (err, fields, files) {
      logger.info("handleTravelersForNewTrip: The friends chosen are: " + JSON.stringify(fields));
      // For each friend who is traveling, add this trip in their session.
      Object.keys(fields).forEach(name => {
          const friendFbid = localFbidHandler.fbid(name);
          logger.info(`Obtained id ${friendFbid} for friend ${name}`);
          const s = localSessions.find(friendFbid);
          if(_.isNull(s) || _.isUndefined(s)) {
          logger.error(`handleTravelersForNewTrip: Could not find session for id ${friendFbid}, friend ${name}`);
          noSessionForFriend = true;
          }
          else {
          // add new trip to friends' session, but do not change context of that session
          s.addNewTrip(localSession.tripNameInContext, localSession.findTrip());
          }
          });
      if(noSessionForFriend) {
      return res.send("Could not add this trip to some of your friend's travel list because Polaama does not know about them yet.");
      }
      else {
        return res.send("saved trips to friends' list");
      }
  }); 
}

WebpageHandler.prototype.displayCities = function(res) {
  return res.send(this.formatter.formatCities());
}

WebpageHandler.prototype.displayCitiesForExistingTrip = function(res) {
  return res.send(this.formatter.addCitiesExistingTrip());
}

WebpageHandler.prototype.handleControlGroup = function(req, res) {
  const form = new formidable.IncomingForm(); 
  // All activities need to happen within the the form.parse function
  const callback = formParseCallback.bind(this);
  const self = this;

  console.log("handleControlGroup called");
  form.parse(req, function(err, fields, files) {
    console.log("form.parse called");
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
  this.session.tripData().addCities(cities);

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
  logger.info(`formParseCallback: The cities chosen for trip ${this.session.tripNameInContext} are: ${JSON.stringify(cities)}. portOfEntry is ${portOfEntry}`);
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
    callback(err, fields, files, res, existingTrip);
    if(self.canProceed) {
      postHandler.startPlanningTrip();
    }
  });
}

module.exports = WebpageHandler;
