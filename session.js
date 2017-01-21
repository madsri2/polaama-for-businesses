'use strict';
const _=require('lodash');
const logger = require('./my-logger');
const TripData = require('./trip-data');
const fs = require('fs');
const Encoder = require('./encoder');

/*
A session has a 1:1 relationship with a user and their trips. A session represents a user. Each user and their trips will have exactly one session at any given time. Today, the scope of a session is tied to the lifetime of this webserver. At any given time, the session will have one trip context that indicates which trip a user is talking about.

TODO: Re-think this decision when sessions need to be persisted across process restarts.  

Trip data contains both information about a group and user specific information. Group information should be visible to everyone and user specific information should be visible only to the individual.

user: {
  group: [groupId,],
  trips: {
    tripName: TripData,
    ...
  }
}

group: {
  users: [fbid list],
  trip: {
    tripData: TripData
  }
}

sessionId -> {
  tripNameInContext: trip name in context,
  awaitingNewTripNameInContext: true or false,
  fbid: facebookUserId, 
  sessionId: session Id,
  botMesgHistory: [Array of chat messages],
  trips: {
    tripName: {
      aiContext: {}, 
      humanContext: {}
      tripData: tripData, // TripData object
    }
    tripName2: {
      ...
    }
  }
  ...
}

At any given time, a user can be chatting about multiple trips to a human. Ongoing conversation with a user about trips are captured in the tripName json object. The tripNameInContext specifies the trip that a user is talking about at a specific point in time. If this is undefined, we ask the user to choose a trip they want to talk about or create a new trip (see webhook-post-handler.js). 

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

// Static variable
Session.sessionBaseDir = "sessions";

function Session(fbid,sessionId) {
  this.sessionId = sessionId;
  this.fbid = fbid;
  this.botMesgHistory = [];
  this.trips  = {};
  this.tripNameInContext = undefined;
  this.rawTripNameInContext = undefined;
}

Session.prototype.persistSession = function() {
  const data = {
    sessionId: this.sessionId,
    fbid: this.fbid,
    botMesgHistory: this.botMesgHistory,
    tripNameInContext: this.tripNameInContext,
    rawTripNameInContext: this.rawTripNameInContext,
    trips: {}
  };
  if(!_.isUndefined(this.hometown)) {
    data.hometown = Encoder.encode(this.hometown);
  }
  Object.keys(this.trips).forEach(name => {
    data.trips[name] = {
      aiContext: this.trips[name].aiContext,
      humanContext: this.trips[name].humanContext,
    }
  });
  const file = `${Session.sessionBaseDir}/${this.fbid}.session`;
  try {
    fs.writeFileSync(file, JSON.stringify(data));
    // logger.info(`persisted session in file <${file}>`);
  }
  catch(err) {
      logger.error(`error writing to session file: ${file}`, err.stack);
  }
}

Session.prototype.persistHometown = function(town) {
  this.hometown = town;
  this.persistSession();
}

// TODO: Implement for the feature that allows user Madhu to use Polaama like another traveler (not a human).
Session.prototype.nooneAwaitingResponse = function() {
  return false;
}

Session.prototype.humanContext = function() {
  return this.findTrip().humanContext;
}

// this function can be called to invalidate a trip, forcing a refresh of this trip by calling TripData (which would contain the latest information).
Session.prototype.invalidateTripData = function() {
  const sessionTrip = this.findTrip();
  sessionTrip.tripData = undefined;
}

Session.prototype.tripData = function() {
  return this.getTrip(this.tripNameInContext);
}

Session.prototype.allTrips = function() {
  const tripDataList = [];
  Object.keys(this.trips).forEach(k => {
    tripDataList.push(this.trips[k].tripData);
  });
  return tripDataList;
}

Session.prototype.allTripNames = function() {
  const tripNames = [];
  Object.keys(this.trips).forEach(k => {
    tripNames.push({
          name: this.trips[k].tripData.data.name,
          rawName: this.trips[k].tripData.data.rawName
    });
  });
  return tripNames;
}

Session.prototype.addTrip = function(tripName) {
  const encTripName = TripData.encode(tripName);
  // typically, when a trip is added to the session, that is also the trip in context that the user wants to discuss.
  this.tripNameInContext = encTripName;
  this.rawTripNameInContext = tripName;
  if(_.isUndefined(this.trips[encTripName])) {
    // this is only possible in case of a new trip created in this session. 
    logger.info(`Creating new trip for session ${this.fbid} for trip ${this.tripNameInContext}`);
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
  // Persist the new trip that was added to this session.
  this.persistSession();
}

Session.prototype.addNewTrip = function(tripName, trip) {
  if(_.isUndefined(tripName)) {
    logger.warn("addNewTrip: undefined tripName. Cannot add new trip to session.");
    return;
  }
  const encTripName = TripData.encode(tripName);
  this.trips[encTripName] = trip;
  this.persistSession();
}

Session.prototype.findTrip = function() {
  return this.trips[this.tripNameInContext];
}

Session.prototype.deleteAiContext = function() {
  const trip = this.findTrip();
  trip.aiContext = {};
  // TODO: Persist information in this session if needed.
}

Session.prototype.updateAiContext = function(context) {
  const trip = this.findTrip();
  trip.aiContext = context;
  // TODO: Persist information
}

Session.prototype.getTrip = function(tripName) {
  if(_.isUndefined(tripName) || _.isUndefined(this.trips[TripData.encode(tripName)])) {
    return null;
  }
  const trip = this.trips[TripData.encode(tripName)];
  // see if the tripData was invalidated and refresh it if it was.
  if(_.isUndefined(trip.tripData)) {
    trip.tripData = new TripData(tripName);
    logger.info(`getTrip: tripData was invalidated for trip ${tripName}. Refreshing it by creating new TripData object`);
  };
  return trip.tripData;
}

Session.prototype.clearAllAwaitingStates = function() {
  this.awaitingComment = false;
  this.awaitingTodoItem = false;
  this.awaitingPacklistItem = false;
  this.awaitingNewTripDetails = false;
  this.awaitingHometownInfo = false;
  this.awaitingCitiesForNewTrip = false;
}

module.exports = Session;
