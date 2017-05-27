'use strict';
const _=require('lodash');
const logger = require('./my-logger');
const Session = require('./session');
const fs = require('fs');
const TripData = require('./trip-data');

const MY_RECIPIENT_ID = "1120615267993271";

let sessions;

// This will contain all user sessions. See session.js for additional details about a session.
// For PRIVATE USE ONLY. Use Sessions.get instead
function Sessions() {
  this.sessions = {};
}

Sessions.get = function() {
  if(!sessions) sessions = new Sessions();
  return sessions;
}

Sessions.path = function() {
  return "/home/ec2-user/sessions";
}

Sessions.prototype.findOrCreate = function(fbid) {
  let sessionId = findSessionId.call(this,fbid);
  if (_.isNull(sessionId)) {
    // No session found for user fbid, let's create a new one
    logger.info("Creating a new session for ",fbid);
    sessionId = new Date().toISOString() + "-" + fbid;
    this.sessions[sessionId] = new Session(fbid, sessionId);
    // persist new session for later use
    this.sessions[sessionId].persistSession();
  }
  return this.sessions[sessionId];
};

Sessions.prototype.find = function(fbid) { 
  const sessionId = findSessionId.call(this, fbid);
  if(_.isNull(sessionId)) {
    logger.info("session does not exist for fbid",fbid);
    return null;
  }
  return this.sessions[sessionId];
}

Sessions.prototype.allSessions = function() {
  if(!Object.keys(this.sessions).length) {
    // load the sessions and then send the reminder notification.
    fs.readdirSync(Session.sessionBaseDir).forEach(file => {
      if(!file.startsWith(".") && file.endsWith(".session")) {
        // extract fbid. The file is of the format <fbid.session>
        const fbid = file.substr(0,file.length - ".session".length);
        // const session = Sessions.retrieveSession(fbid);
        const session = new Session(fbid); // we don't have the session id. Hopefully, it will be obtained from the persistent store in the constructor
        this.sessions[session.sessionId] = session;
      } 
    }, this);
  }
  logger.info(`allSessions: There are ${Object.keys(this.sessions).length} sessions`);
  return this.sessions;
}

Sessions.prototype.reloadSession = function(sessionId) {
  if(!this.sessions[sessionId]) return;
  const fbid = this.sessions[sessionId].fbid;
  this.sessions[sessionId] = new Session(fbid, sessionId);
  return this.sessions[sessionId];
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
    }
  });
  if(_.isUndefined(sessionId)) {
    // try to retrieve it from the file.
    // const session = Sessions.retrieveSession(fbid);
    const session = new Session(fbid); // see if the sessionId can be obtained from persistent store
    if(!session.synced) {
      logger.warn(`session for ${fbid} does not exist in sessions object and in file.`);
      return null;
    }
    else {
      sessionId = session.sessionId;
      this.sessions[sessionId] = session;
      // logger.info(`found session ${session.sessionId} from file for fbid ${fbid}.`);
    }
  }
  return sessionId;
};

/********************* TESTING APIs ****************/

Sessions.prototype.testing_delete = function(fbid) {
  const session = this.find(fbid);
  if(!session) return;
  session.testing_delete();
  delete this.sessions[session.sessionId];
}

/********************* TESTING APIs ****************/

module.exports = Sessions;
