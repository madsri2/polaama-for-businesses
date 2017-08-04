'use strict';
const fs = require('fs');
const validator = require('node-validator');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

let countriesList = getList();

function getList() {
  const file = `${baseDir}/countries/countries-iatacode.json`;
  if(!fs.existsSync(file)) throw new Error(`getList: file ${file} does not exist.`);
  return JSON.parse(fs.readFileSync(file, 'utf8')).response;
}

function DestinationCitiesWorkflow(handler) {
  this.handler = handler;
  this.sessionState = handler.sessionState;
  this.trip = handler.session.tripData();
  this.destination = this.trip.data.destination;
  this.session = handler.session;
}

// returns false to indicate that we need more details from user. If true, we are done with this workflow.
DestinationCitiesWorkflow.prototype.handleNewTrip = function(messageText) {
  if(!this.trip.cityItinDefined()) {
    if(!this.sessionState.get("awaitingCitiesForNewTrip")) {
      if(isDestinationACountry.call(this)) {
        // this is a country. So, ask for cities in this country.
        this.trip.setCountry(this.destination);
        if(!determineCities.call(this)) {
          // ask user to enter cities and port of entry because we don't have that data yet.
          const messages = [
            `For your trip to ${this.trip.data.country}, add cities and number of days in each city in the following format`,
            `seattle(3),portland(4),sfo(5)`,
            `The first city in your list will be the port of entry` 
          ];
          this.handler.sendMultipleMessages(this.session.fbid, this.handler.textMessages(messages));
          this.sessionState.set("awaitingCitiesForNewTrip");
          return false;
        }
        // determineCities returned true, indicating that we have city list information
        this.sessionState.clear("awaitingCitiesForNewTrip");
        return true;
      }
      // city. So, just set cityItin and add port of entry
      this.trip.addCityItinerary([this.destination], [this.trip.data.duration]);
      this.trip.addPortOfEntry(this.destination);
      this.sessionState.clear("awaitingCitiesForNewTrip");
      return true;
    }
    // case where user has sent city details
    try {
      if(this.sessionState.get("awaitingCitiesForNewTrip")) {
        // logger.debug(`handleNewTrip: getting city details: ${messageText}`);
        if(!messageText) throw new Error(`handleNewTrip: session state awaitingCitiesForNewTrip, but the passed parameter 'messageText' is null or undefined`);
        return getCityDetails.call(this, messageText);
      }
    }
    catch(e) {
      logger.error(`handleNewTrip: exception: ${e.stack}`);
      return false;
    }
  }
  // trip.cityItin is defined. Nothing to do for us here.
  return true;
}

DestinationCitiesWorkflow.prototype.handleExistingTrip = function() {
  this.existingTrip = true;
}

function determineCities() {
  const country = this.trip.country;
  if(!country.cities) {
    // logger.warn(`determineCities: countries not defined in trip ${trip.rawTripName}. Doing nothing`);
    return false;
  }
  // logger.info(`Asking user to select from the following cities: ${JSON.stringify(country)} for country ${this.trip.rawTripName}.`);
  this.handler.sendTextMessage(this.session.fbid,`Which cities of ${country.name} are you traveling to?`);
  let uri = "cities";
  if(this.existingTrip) {
    uri = "add-cities";
  }
  const messageData = {
    recipient: {
      id: this.session.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Select cities",
            buttons: [{
              type:"web_url",
              url: this.handler.sendUrl(`${this.trip.data.name}/${uri}`),
              title:"Cities",
              webview_height_ratio: "full",
              messenger_extensions: true,
            }]
          }]
        }
      }
    }
  };
  this.handler.sendAnyMessage(messageData);
  return true;
}

function extractCityDetails(details) {
  try {
    const input = details.split(',');
    const regex = /^[A-Z a-z]+\((\d+)\)/;
    const check = validator.isArray(validator.isString({'regex': regex, message: "It should be of the form 'city(2)'"}), {min: 1});
    let error = null;
    validator.run(check, input, function(ec, e) {
      if(ec > 0) error = new Error(`Invalid input value "${e[0].value}": ${e[0].message}`);
    });
    if(error) throw error;
    this.cities = [];
    this.numberOfDays = [];
    input.forEach(item => {
      this.cities.push(item.split('(')[0]);
      this.numberOfDays.push(item.match(regex)[1]);
    }, this);
  }
  catch(e) {
    this.handler.sendTextMessage(this.session.fbid, e.message); // TODO: This assumes the error thrown above is the only exception, which might not be the case.
    // rethrow here so that other functions can short-circuit
    throw e;
  }
}

function getCityDetails(details) {
  try {
    extractCityDetails.call(this, details);
    // TODO: Validate city is valid by comparing against list of known cities
    this.trip.addCityItinerary(this.cities, this.numberOfDays);
    
    if(this.existingTrip) this.sessionState.clear("awaitingCitiesForExistingTrip");
    else {
      // assume first city is port of entry.
      this.trip.addPortOfEntry(this.cities[0]);
      this.sessionState.clear("awaitingCitiesForNewTrip");
    }
    // done doing whatever we need. Ask handler to proceed
    return true;
  }
  catch(e) {
    // rethrow so that calling function can short-circuit
    throw e;
  }
}

function isDestinationACountry() {
  let isCountry = false;
  if(!countriesList) countriesList = getList();
  countriesList.forEach(country => {
    // logger.debug(`isDestinationACountry: ${JSON.stringify(country)}`);
    if([country.code.toLowerCase(),country.name.toLowerCase(),country.code3.toLowerCase()].includes(this.destination.toLowerCase())) isCountry = true;
  });
  return isCountry;
}

module.exports = DestinationCitiesWorkflow;
