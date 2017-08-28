'use strict';
const fs = require('fs');
const validator = require('node-validator');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Promise = require('promise');

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
  this.airportCodes = handler.airportCodes;
}

// returns promise which:
// resolves to false to indicate that we need more details from user. 
// true, to indicate that we are done with this workflow.
// rejects with false on error. Takes care of sending appropriate mesage back to user.
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
          return Promise.resolve(false);
        }
        // determineCities returned true, indicating that we have city list information
        this.sessionState.clear("awaitingCitiesForNewTrip");
        return Promise.resolve(true);
      }
      // city. So, set cityItin and add port of entry. Set the cityItin details here so that users can start planning trip.
      const self = this;
      return addPortOfEntryAndCode.call(this, this.destination).then(
        function(response) {
          if(response) {
            self.trip.addCityItinerary([self.trip.data.portOfEntry], [self.trip.data.duration]);
            return Promise.resolve(true);
          }
          logger.error(`handleNewTrip: Expected response to be true, but it is ${response}`);
          return Promise.resolve(response);
        },
        function(err) {
          logger.error(`handleNewTrip: promise was rejected with err ${err}`);
          return Promise.reject(err);
        }
      );
    }
    // case where user has sent city details
    try {
      if(this.sessionState.get("awaitingCitiesForNewTrip")) {
        // logger.debug(`handleNewTrip: getting city details: ${messageText}`);
        if(!messageText) { 
          logger.error(`handleNewTrip: session state awaitingCitiesForNewTrip, but the passed parameter 'messageText' is null or undefined`);
          this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat. Be back in a bit..");
          return Promise.reject(false);
        }
        return getCityDetails.call(this, messageText);
      }
    }
    catch(e) {
      logger.error(`handleNewTrip: Exception: ${e.stack}`);
      this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat. Be back in a bit..");
      return Promise.reject(false);
    }
  }
  // trip.cityItin is defined. Nothing to do for us here.
  return Promise.resolve(true);
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

function addPortOfEntryAndCode(destination) {
  const self = this;
  return this.airportCodes.promise.then(
      function(response) {
        const code = self.airportCodes.getCode(destination);
        if(code) {
          // logger.debug(`addPortOfEntryAndCode: adding city ${destination} and code ${code}`);
          self.trip.addPortOfEntryAndCode(destination, code);
          self.sessionState.clear("awaitingCitiesForNewTrip");
          return Promise.resolve(true);
        }
        // see if the passed value was actually a code instead of a city
        const city = self.airportCodes.getCity(destination);
        if(city) {
          // logger.debug(`addPortOfEntryAndCode: adding city ${city} and code ${destination}`);
          self.trip.addPortOfEntryAndCode(city, destination);
          self.sessionState.clear("awaitingCitiesForNewTrip");
          return Promise.resolve(true);
        }
        logger.error(`addPortOfEntryAndCode: Could not find code for city ${destination}`);
        self.handler.sendTextMessage(self.session.fbid,"Please enter a valid destination city or airport code");
        return Promise.reject(false);
      },
      function(err) {
        logger.error(`addPortOfEntryAndCode: Error from airportCode's constructor! ${err.stack}`);
        self.handler.sendTextMessage(self.session.fbid,"Even bots need to eat. Be back in a bit..");
        return Promise.reject(false);
      }
  );
}

function getCityDetails(details) {
    extractCityDetails.call(this, details);
    // TODO: Validate city is valid by comparing it against data in airports.dat
    this.trip.addCityItinerary(this.cities, this.numberOfDays);
    if(this.existingTrip) {
      this.sessionState.clear("awaitingCitiesForExistingTrip");
      // done doing whatever we need. Ask handler to proceed
      return Promise.resolve(true);
    }
    // return a promise. Assume first city is port of entry.
    return addPortOfEntryAndCode.call(this, this.cities[0]);
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
