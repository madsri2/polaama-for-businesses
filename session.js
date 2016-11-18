'use strict';
const _=require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();
const TripData = require('./trip-data');
const tripData = new TripData();

/*
A session has a 1:1 relationship with a user-trip. A session represents a user. Each user and their trip will have exactly one session at any given time. Today, the scope of a session is tied to the lifetime of this webserver. TODO: Re-think this decision when sessions need to be persisted across process restarts.  
sessionId -> {
  fbid: facebookUserId, 
  botMesgHistory: [Array of chat messages]
  tripName: {
    aiContext: {}, 
    humanContext: {}
  }
  tripName2: {
    ...
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

// This will contain all user sessions.
const sessions = {};

function Session() {
}

// TODO: This needs to be removed. The functions below should return the actual session object instead of a session id.
Session.prototype.getSessions = function(fbid) {
  return sessions;
}

Session.prototype.find = function(fbid) { 
  if(_.isUndefined(fbid)) {
    logger.info("undefined fbid passed. pass a valid fbid");
    return null;
  }

  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(sessions).forEach(k => {
    logger.info("comparing ",fbid," with session id ",sessions[k].fbid);
    if (sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
      logger.info("Found session for ",fbid, JSON.stringify(sessions[sessionId]));
    }
  });
  if(_.isUndefined(sessionId)) {
    logger.info("Did not find session for ", fbid, "dump of entire session ", JSON.stringify(sessions));
  }
  return sessionId;
};

const MY_RECIPIENT_ID = "1120615267993271";

Session.prototype.findOrCreate = function(fbid, tripNames) {
  let sessionId = this.find(fbid);
  if (_.isUndefined(sessionId)) {
    // No session found for user fbid, let's create a new one
    logger.info("Creating a new session for ",fbid);
    sessionId = new Date().toISOString() + "-" + fbid;
    sessions[sessionId] = {fbid: fbid, context: {}};
    sessions[sessionId].botMesgHistory = [];
    sessions[sessionId].context.sessionId = sessionId;
  }
  tripNames.forEach(function(tripName) {
    const encTripName = tripData.encode(tripName);
    if(_.isUndefined(sessions[sessionId][encTripName])) {
      // define a tripName json object.
      sessions[sessionId][encTripName] = { 
        aiContext: {},
        humanContext: {
          sessionId: sessionId,
          // TODO: Need a better way to get the human's fbid than using my messenger's senderId.
          fbid: MY_RECIPIENT_ID,
          conversations: {}
        }
      };
    }
  });
  logger.info("This session's id is",sessionId);
  return sessionId;
};

module.exports = Session;
