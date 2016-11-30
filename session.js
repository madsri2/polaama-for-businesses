'use strict';
const _=require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();
const TripData = require('./trip-data');

/*
A session has a 1:1 relationship with a user-trip. A session represents a user. Each user and their trips will have exactly one session at any given time. Today, the scope of a session is tied to the lifetime of this webserver. TODO: Re-think this decision when sessions need to be persisted across process restarts.  
sessionId -> {
  tripNameInContext: trip name in context,
  fbid: facebookUserId, 
  sessionId: session Id,
  botMesgHistory: [Array of chat messages],
  trips: {
    tripName: {
      aiContext: {}, 
      humanContext: {}
      tripData: tripData, // TripData object
      travelers: [fbid of all travelers traveling on this trip]
    }
    tripName2: {
      ...
    }
  }
  ...
}

At any given time, a user can be chatting about multiple trips to a human. Ongoing conversation with a user about trips are captured in the tripName json object.

aiContext contains AI related context (Wit.AI). Most of the keys are story specific entries. See the actions variable for context details in each action. Once a specific story's end is reached (as defined in the wit UI), the done flag is set to true so that this context is deleted. This way, we don't carry context beyond stories, thereby confusing wit
aiContext -> {
  sessionId: // session id
  done: true of false, 
  ... // list of entries specific to an action
}

humanContext contains information about a specific trip being discussed with a human. 
humanContext -> {
  sessionId: // session id
  fbid: //facebook user id of the human who is supposed to respond to these conversations
  conversations: { // set of current ongoing conversations for this trip with this user
    seq -> { // sequence number of the first message from a user that started this conversation. 
      awaitingResponse: boolean,
      messagesSent: [], // a list of messages sent by the human in response to the original message.
      originalMessage: String // original message sent from the user
    }
    ...
  }
}
*/

const MY_RECIPIENT_ID = "1120615267993271";

function Session(fbid,sessionId) {
  this.sessionId = sessionId;
  this.fbid = fbid;
  this.botMesgHistory = [];
  this.trips  = {};
}

Session.prototype.findTrip = function(tripName) {
  return this.trips[TripData.encode(tripName)];
}

Session.prototype.deleteAiContext = function(tripName) {
  const trip = this.findTrip(tripName);
  trip.aiContext = {};
}

Session.prototype.updateAiContext = function(tripName, context) {
  const trip = this.findTrip(tripName);
  trip.aiContext = context;
}

// TODO: Implement
Session.prototype.nooneAwaitingResponse = function() {
  return false;
}

Session.prototype.addTrip = function(tripName) {
  const encTripName = TripData.encode(tripName);
  if(_.isUndefined(this.trips[encTripName])) {
    // define a tripName json object.
    this.trips[encTripName] = { 
      aiContext: {
        sessionId: this.sessionId
      },
      humanContext: {
        sessionId: this.sessionId,
        // TODO: Need a better way to get the human's fbid than using my messenger's senderId.
        fbid: MY_RECIPIENT_ID,
        conversations: {}
      },
      tripData: new TripData(tripName)
    };
  }
}

Session.prototype.aiContext = function(tripName) {
  return this.findTrip(tripName).aiContext;
}

Session.prototype.humanContext = function(tripName) {
  return this.findTrip(tripName).humanContext;
}

Session.prototype.tripData = function(tripName) {
  return this.findTrip(tripName).tripData;
}

Session.prototype.allTrips = function() {
  const tripDataList = [];
  Object.keys(this.trips).forEach(k => {
    console.log(`pushing trip for session ${this.sessionId}`);
    tripDataList.push(this.trips[k].tripData);
  });
  return tripDataList;
}

///// ****************** V2 Functions *********************
Session.prototype.addTripV2 = function(tripName) {
  const encTripName = TripData.encode(tripName);
  this.tripNameInContext = encTripName;
  this.rawTripNameInContext = tripName;
  if(_.isUndefined(this.trips[encTripName])) {
    // define a tripName json object.
    this.trips[encTripName] = { 
      aiContext: {
        sessionId: this.sessionId
      },
      humanContext: {
        sessionId: this.sessionId,
        // TODO: Need a better way to get the human's fbid than using my messenger's senderId.
        fbid: MY_RECIPIENT_ID,
        conversations: {}
      },
      tripData: new TripData(tripName)
    };
  }
}

Session.prototype.findTripV2 = function() {
  return this.trips[TripData.encode(this.tripNameInContext)];
}

Session.prototype.deleteAiContextV2 = function() {
  const trip = this.findTripV2();
  trip.aiContext = {};
}

Session.prototype.updateAiContext = function(context) {
  const trip = this.findTripV2();
  trip.aiContext = context;
}

module.exports = Session;
