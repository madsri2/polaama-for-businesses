'use strict';

const baseDir = '/home/ec2-user';
const Promise = require('promise');
const logger = require(`${baseDir}/my-logger`);

function Workflow(handler, message, quick_reply) {
  this.message = message;
  this.quick_reply = quick_reply;
  this.handler = handler;
  this.session = handler.session;
  this.trip = this.session.tripData();
  this.sessionState = handler.sessionState;
  this.airportCodes = handler.airportCodes;
}

// return false to indicate that we are not done setting the departure cities yet. The caller will use this return type to determine if they need to call this function again after additional input (return false) or proceed with more work (return true);
Workflow.prototype.set = function() {
  const trip = this.trip;
  const quick_reply = this.quick_reply;
  // if a hometown exists for this session, we don't have a leavingFrom for this trip and we are not awaiting the departureCity from the user, find out if the user wants to use the hometown as departure city.
  // logger.debug(`set: session hometown: ${this.session.hometown}; leaving from: ${trip.data.leavingFrom}`);
  if(this.session.hometown && !trip.data.leavingFrom && !this.sessionState.get("awaitingDepartureCityDetails")) {
    if(this.sessionState.get("awaitingUseHometownAsDepartureCity")) {
        const payload = quick_reply.payload;
        if(!payload) {
  			  logger.error(`set: BUG! Session is in state awaitingUseHometownAsDepartureCity but quick_reply payload is undefined!`);
  				this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
          return false;
        }
        if(payload === "qr_use_hometown_as_dep_city_no") {
          this.sessionState.clear("awaitingUseHometownAsDepartureCity");
          this.sessionState.set("awaitingDepartureCityDetails");
          this.handler.sendTextMessage(this.session.fbid,"What is your departure city (or airport code)?");
          return false;
        }
        if(payload === "qr_use_hometown_as_dep_city_yes") {
          // use the hometown as departure city. This is one of the terminal states for this workflow
          this.sessionState.clear("awaitingUseHometownAsDepartureCity");
          const self = this;
          const promise = setDepartureCityAndCode.call(this, this.session.hometown);
          return promise.then(
            function(result) {
              logger.info(`set: Successfully set city & code: ${self.session.hometown}`);
              return true;
            },
            function(err) {
              logger.error(`set: could not get city or code from payload: ${cityOrCode}`);
              this.handler.sendTextMessage(self.session.fbid,"Please enter a valid city or airport code");
              return false;
          });
        }
        logger.error(`setDepartureCityAndHometown: BUG! Unexpected value in payload: ${payload}`);
  			this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
        return false;
    }
    this.sessionState.set("awaitingUseHometownAsDepartureCity");
    this.handler.sendAnyMessage({
      recipient: { id: this.session.fbid },
      message: {
        text: `Are you leaving from your hometown of ${this.session.hometown}?`,
        quick_replies: [
          {content_type: "text", title: "Yes", payload: "qr_use_hometown_as_dep_city_yes" }, 
          {content_type: "text", title: "No", payload: "qr_use_hometown_as_dep_city_no"}
        ]
      }
    });
    return false;
  }
  logger.debug(`hometown: ${this.session.hometown}; leavingFrom: ${trip.data.leavingFrom}`);
  return setDepCityFromUser.call(this);
}

// return a promise that gets code from AirportCodes and update trip object accordingly.
function setDepartureCityAndCode(cityOrCode) {
  const self = this;
  const trip = this.trip;
  return this.airportCodes.promise.then(
    function(response) {
      const code = self.airportCodes.getCode(cityOrCode);
      if(!code) {
        const city = self.airportCodes.getCity(cityOrCode);
        if(city) {
          // logger.debug(`setDepartureCityAndCode: Set trip's leavingFrom value to ${city}; code: ${cityOrCode}`);
          trip.persistDepartureCityAndCode(city, cityOrCode);
          return Promise.resolve(city);
        }
        else return Promise.reject(new Error(`could not find code for value ${cityOrCode}`));
      }
      // we have validated that passed value cityOrCode is a valid city. So, resolve accordingly.
      trip.persistDepartureCityAndCode(cityOrCode, code);
      return Promise.resolve(cityOrCode);
    },
    function(err) {
      return Promise.reject(err);
    }
  );
}

// if we are awaiting departure city from user, handle that.
function setDepCityFromUser() {
  const trip = this.trip;
  const quick_reply = this.quick_reply;
  if(!trip.data.leavingFrom) {
    if(!this.sessionState.get("awaitingDepartureCityDetails")) {
      this.sessionState.set("awaitingDepartureCityDetails");
      this.handler.sendTextMessage(this.session.fbid,"What is your departure city (or airport code)?");
      return false;
    }
    // we have input from user. Handle that.
    const promise = setDepartureCityAndCode.call(this, this.message);
    const self = this;
    return promise.then(function(result) {
        return setHometown.call(self);
      },
      function(err) {
        logger.error(`setDepCityFromUser: could not get city or code from payload: ${self.message}`);
        self.handler.sendTextMessage(self.session.fbid,"Please enter a valid city or airport code");
        return false;
    });
  }
  // only thing remaining is to see if the hometown needs to be set.
  return setHometown.call(this);
}

function setHometown() {
  // nothing to do if hometown already exists
  if(this.session.hometown) {
    logger.debug(`setHometown: Hometown already exists. Nothing else left to do`);
    return true;
  }

  if(this.sessionState.get("awaitingUseAsHometown")) {
    const payload = this.quick_reply.payload;
    if(!payload) {
			  logger.error(`setHometown: BUG! Session is in state awaitingUseHometown but quick_reply payload is undefined!`);
				this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
      return false;
    }
    // nothing left to do if we don't need to use this as hometown.
    this.sessionState.clear("awaitingUseAsHometown");
    this.sessionState.clear("awaitingDepartureCityDetails");
    if(payload === "qr_use_as_hometown_no") return true;
    this.session.persistHometown(this.trip.data.leavingFrom);
    // logger.debug(`setHometown: Successfully set session's hometown ${this.trip.data.leavingFrom}`);
    return true;
  }

  // now ask the user if this departure city is their hometown for future use.
  const trip = this.trip;
  this.handler.sendAnyMessage({
    recipient: {
      id: this.session.fbid
    },
    message: {
      text: `Do you want to set ${trip.data.leavingFrom} as your hometown for future use?`,
      quick_replies: [{
        content_type: "text",
        title: "Yes",
        payload: "qr_use_as_hometown_yes"
      }, {
        content_type: "text",
        title: "No",
        payload: "qr_use_as_hometown_no"
      }]
    }
  });
  this.sessionState.set("awaitingUseAsHometown");
  return false;
}

module.exports = Workflow;
