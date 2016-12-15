'use strict';
const _ = require('lodash');
const request = require('request');
const logger = require('./my-logger');
const TripData = require('./trip-data');
const TripDataFormatter = require('./trip-data-formatter');
const Sessions = require('./sessions');
const moment = require('moment');
const FbidHandler = require('./fbid-handler');
const fs = require('fs');
const formidable = require('formidable');

function WebpageHandler(id, tripName) {
  this.fbidHandler = new FbidHandler();
  this.fbid = this.fbidHandler.decode(id);
  this.tripName = tripName;
  const ss = new Sessions();
  this.session = ss.find(this.fbid);
  if(_.isNull(this.session)) {
    logger.error(`no session exists for id ${this.fbid}`);
    return;
  }
  logger.info(`identified session with id ${this.session.sessionId} for id ${this.fbid}`);
  this.trip = this.session.getTrip(tripName);
  if(_.isNull(this.trip)) {
    logger.error(`No trip named ${tripName} exists in session ${this.session.sessionId}`);
    return;
  }
  this.formatter = new TripDataFormatter(this.trip);
}

WebpageHandler.prototype.displayTrip = function(res) {
  return res.send(this.formatter.formatTripDetails());
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

/*
This function serves as the entry point for all other functions. Callback will be one of the functions above. The args array is to handle cases where some functions require more than 1 argument (like displayRawComments above).
*/ 
WebpageHandler.prototype.handleWebpage = function(res, callback, args) {
  if(_.isNull(this.session)) {
    return res.send("Invalid request!");
  }
  if(_.isNull(this.trip)) {
    return res.send(`You don't yet have a trip named ${this.tripName}!`);
  }
  return callback.call(this, res, args);
}

module.exports = WebpageHandler;
