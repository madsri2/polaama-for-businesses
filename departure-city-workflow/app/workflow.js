'use strict';

const baseDir = '/home/ec2-user';
const Promise = require('promise');
const logger = require(`${baseDir}/my-logger`);
const IataCodeGetter = require(`${baseDir}/iatacode-getter`);

function Workflow(handler, message, quick_reply) {
  this.message = message;
  this.quick_reply = quick_reply;
  this.handler = handler;
  this.session = handler.session;
  this.trip = this.session.tripData();
  this.sessionState = handler.sessionState;
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
        this.sessionState.set("awaitingDepartureCityDetails");
        this.handler.sendTextMessage(this.session.fbid,"What is your departure city (or airport code)?");
        return false;
      }
      if(payload === "qr_use_hometown_as_dep_city_yes") {
        // use the hometown as departure city. This is one of the terminal states for this workflow
        trip.persistDepartureCity(this.session.hometown);
        return true;
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
  return setDepCityFromUser.call(this);
}

// Create a promise that finds a city for 
function setDepartureCity() {
  const cityOrCode = this.message;
  const self = this;
  const iata = new IataCodeGetter(cityOrCode);
  const trip = this.trip;
  return iata.getCodePromise(cityOrCode).then(function(response) {
      // logger.debug(`setDepartureCity: value for ${cityOrCode} is ${JSON.stringify(response)}`);
      // A simple promise that passes the value. Note that we called getCodePromise as a way to validate this city. So, pass the original value instead of value returned by getCodePromise, which will be the airpot code.
      return new Promise(function(fulfil, reject) {
        fulfil(cityOrCode);
      });
    },
    function(err) {
      return iata.getCity(cityOrCode);
  });
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
    const promise = setDepartureCity.call(this);
    let returnVal = true;
    const self = this;
    return promise.then(function(result) {
        // logger.debug(`setDepCityFromUser: Setting trip's leavingFrom value to be ${result}`);
        trip.persistDepartureCity(result);
        return setHometown.call(self);
      },
      function(err) {
        logger.error(`setDepartureCityAndHometown: could not get city or code from payload: ${cityOrCode}`);
        this.handler.sendTextMessage(self.session.fbid,"Please enter a valid city or airport code");
        return false;
    });
  }
  // only thing remaining is to see if the hometown needs to be set.
  return setHometown.call(this);
}

function setHometown() {
  // nothing to do if hometown already exists
  if(this.session.hometown) return true;

  if(this.sessionState.get("awaitingUseAsHometown")) {
    const payload = this.quick_reply.payload;
    if(!payload) {
			  logger.error(`setDepartureCityAndHometown: BUG! Session is in state awaitingUseHometown but quick_reply payload is undefined!`);
				this.handler.sendTextMessage(this.session.fbid,"Even bots need to eat! Be back in a bit..");
      return false;
    }
    // nothing left to do if we don't need to use this as hometown.
    this.sessionState.clear("awaitingUseAsHometown");
    this.sessionState.clear("awaitingDepartureCityDetails");
    if(payload === "qr_use_as_hometown_no") return true;
    this.session.persistHometown(this.trip.data.leavingFrom);
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
