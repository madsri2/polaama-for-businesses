'use strict';
const _=require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();
const Session = require('./session.js');

const MY_RECIPIENT_ID = "1120615267993271";

// This will contain all user sessions. See session.js for additional details about a session.
function Sessions() {
  this.sessions = {};
}

Sessions.prototype.findOrCreate = function(fbid, tripName) {
  logger.info("findOrCreate: fbid ",fbid," tripName: ",tripName);
  let sessionId = findSessionId.call(this,fbid);
  if (_.isUndefined(sessionId)) {
    // No session found for user fbid, let's create a new one
    logger.info("Creating a new session for ",fbid);
    sessionId = new Date().toISOString() + "-" + fbid;
    this.sessions[sessionId] = new Session(fbid, sessionId);
  }
  this.sessions[sessionId].addTrip(tripName);
  logger.info("This session's id is",sessionId);
  return this.sessions[sessionId];
};

Sessions.prototype.find = function(fbid) { 
  const sessionId = findSessionId.call(this, fbid);
  if(_.isUndefined(sessionId)) {
    logger.info("session does not exist for fbid",fbid);
    return null;
  }
  return this.sessions[sessionId];
}

Sessions.prototype.allSessions = function() {
  return this.sessions;
}

function findSessionId(fbid) {
  if(_.isUndefined(fbid)) {
    logger.info("undefined fbid passed. pass a valid fbid");
    return null;
  }

  let sessionId;
  // Let's see if we already have a session for the user fbid
  Object.keys(this.sessions).forEach(k => {
    if (this.sessions[k].fbid === fbid) {
      // Yep, got it!
      sessionId = k;
      logger.info(`found session for ${fbid}. session id is ${sessionId}`);
    }
  });
  if(_.isUndefined(sessionId)) {
    logger.info("Did not find session for ", fbid, "dump of entire session ", JSON.stringify(this.sessions));
  }
  return sessionId;
};

module.exports = Sessions;
