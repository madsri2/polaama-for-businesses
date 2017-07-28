'use strict';
const fs = require('fs');
const Encoder = require('./encoder');
const moment = require('moment');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
/*
TODO: Fix ME. This class represents a user profile and a session. Fix that!
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
Session.sessionBaseDir = "/home/ec2-user/sessions";

Session.adminId = MY_RECIPIENT_ID;

function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
  }
  return s4() + '-' + s4();
}

function Session(fbid,sessionId) {
  if(!fbid) throw new Error(`Session: required field fbid is missing`);
  this.fbid = fbid;
	this.guid = guid();
  this.sessionId = sessionId;
  this.botMesgHistory = [];
  this.trips  = {};
  this.tripNameInContext = null;
  this.rawTripNameInContext = null;
  this.noTripContext = true; // by default, there will be no trip context
  this.synced = false;
  sync.call(this); // sync from persistent store
}

function sync() {
  const file = `${Session.sessionBaseDir}/${this.fbid}.session`;
  try {
    fs.accessSync(file, fs.F_OK);
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.sessionId = data.sessionId; // there's a possibility that the constructor was only called with fbid, in which case sessionId will be null. Fix that here.
      this.tripNameInContext = data.tripNameInContext;
      this.rawTripNameInContext = data.rawTripNameInContext;
      if(this.tripNameInContext) {
        this.noTripContext = false;
        if(!this.rawTripNameInContext) throw new Error(`session has tripNameInContext ${this.tripNameInContext} but no rawTripNameInContext. Possible BUG!`);
      }
      this.hometown = data.hometown;
      Object.keys(data.trips).forEach(name => {
        // we know that the name of the trip that was persisted is encoded.
        this.trips[name] = {
          aiContext: data.trips[name].aiContext,
          humanContext: data.trips[name].humanContext,
          tripData: new TripData(name, this.fbid)
        };
      }, this);
      this.synced = true;
    }
    catch(err) {
      logger.error("error reading from ", file, err.stack);
    }
  }
  catch(err) { logger.warn(`sync: file ${file} cannot be accessed (it is possible that this session never existed): ${err.message}`); }
}

Session.prototype.persistSession = function() {
  const data = {
    sessionId: this.sessionId,
    fbid: this.fbid,
    botMesgHistory: this.botMesgHistory,
    trips: {}
  };
  if(this.tripNameInContext) {
    data.tripNameInContext = this.tripNameInContext;
    if(!this.rawTripNameInContext) throw new Error(`persistSession: tripNameInContext is present, but rawTripNameInContext is null. Potential BUG!`);
    data.rawTripNameInContext = this.rawTripNameInContext;
    this.noTripContext = false;
  }
  if(this.hometown) data.hometown = Encoder.encode(this.hometown);
  Object.keys(this.trips).forEach(name => {
    data.trips[name] = {
      aiContext: this.trips[name].aiContext,
      humanContext: this.trips[name].humanContext,
    }
  });
  try {
    const filename = file.call(this);
    fs.writeFileSync(filename, JSON.stringify(data));
    // logger.debug(`persistSession: wrote ${(JSON.stringify(data)).length} bytes to file ${filename}`);
  }
  catch(err) {
      logger.error(`error writing to session file: ${file}`, err.stack);
  }
}

Session.prototype.resetTripContext = function() {
  this.noTripContext = true;
  this.tripNameInContext = null;
  this.rawTripNameInContext = null;
  this.persistSession();
}

Session.prototype.doesTripContextExist = function() {
  if(this.noTripContext) {
    if(this.tripNameInContext) throw new Error(`doesTripContextExist: noTripContext is set to true. But tripNameInContext has value ${this.tripNameInContext}. Potential bug!`);
    if(this.rawTripNameInContext) throw new Error(`doesTripContextExist: noTripContext is set to true. But rawTripNameInContext has value ${this.rawTripNameInContext}. Potential bug!`);
  }
  return !this.noTripContext;
}

function file() {
  return `${Session.sessionBaseDir}/${filename.call(this)}`;
}

function filename() {
  return `${this.fbid}.session`;
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
  if(!sessionTrip || !sessionTrip.tripData) {
    return;
  }
	logger.debug(`invalidateTripData: Marking trip ${sessionTrip.tripData.rawTripName} as stale. Session id is ${this.guid}`);
	sessionTrip.tripData = null;
}

// TODO: Find instances where the trip is used and replace with findTrip. Then remove this function
Session.prototype.tripData = function() {
  return this.findTrip();
}

Session.prototype.allTrips = function() {
  const tripDataList = [];
  Object.keys(this.trips).forEach(tripName => {
    tripDataList.push(this.getTrip(tripName));
  });
  return tripDataList;
}

Session.prototype.getPastTrips = function() {
  let trips = [];
  this.allTrips().forEach(trip => {
    // logger.debug(`getPastTrips: Now looking at trip ${trip.tripName}`);
    const start = moment(new Date(trip.data.startDate).toISOString());
    const daysToTrip = start.diff(moment(),'days');
    if(!trip.data.startDate || daysToTrip <= 0) {
      trips.push({
        name: trip.data.name,
        rawName: trip.data.rawName,
        daysToTrip: daysToTrip
      });
    }
  });
  return trips;
}

Session.prototype.getCurrentAndFutureTrips = function() {
  let trips = [];
  let pastTrips = false;
  // Filter past trips
  let daysToEndOfTrip = -1;
  this.allTrips().forEach(trip => {
    // if trip.data is not present and if the trip file is not present, then throw an error.
    if(!trip.tripFilePresent && !trip.data) { 
      logger.info(`session dump: ${JSON.stringify(this)}; trip: ${JSON.stringify(trip)}`);
      logger.error(`getCurrentAndFutureTrips: trip.data not present for trip ${trip.rawTripName}. Possible BUG since session ${this.fbid} still contains this trip. In the interests of not letting the user continue, we are ignoring this and proceeding (instead of throwing an error). This would be a throwable error in testing, but not production.`);
      return;
    }
    if(trip.data.returnDate && trip.data.returnDate != "unknown") {
      const end = moment(new Date(trip.data.returnDate).toISOString());
      daysToEndOfTrip = end.diff(moment(),'days');
    }
    else {
      // logger.debug(`getCurrentAndFutureTrips: considering trip ${trip.rawTripName} with startDate ${trip.data.startDate} and unknown return date`);
      trips.push({
        name: trip.data.name,
        rawName: trip.data.rawName,
        daysToTrip: 0
      });
      return;
    }
    // if we don't know the start date for whatever reason, include those trips as well
    if(!trip.data.startDate || daysToEndOfTrip >= 0) {
      // logger.debug(`getCurrentAndFutureTrips: considering trip ${trip.rawTripName} with startDate ${trip.data.startDate} and days to end of trip ${daysToEndOfTrip}`);
      trips.push({
        name: trip.data.name,
        rawName: trip.data.rawName,
        daysToTrip: daysToEndOfTrip
      });
      return;
    }
    // logger.debug(`getCurrentAndFutureTrips: ignoring trip ${trip.rawTripName} which happened in the past: ${trip.data.startDate}`);
    pastTrips = true;
  }, this);
  const sortedArr = trips.sort(function(a,b) {
    return a.daysToTrip - b.daysToTrip;
  });
  // Return the trip with the most recent start date first.
  let names = [];
  sortedArr.forEach(t => {
    names.push({
      name: t.name,
      rawName: t.rawName
    });  
  });
  return {
    pastTrips: pastTrips,
    futureTrips: names
  };
}

Session.prototype.setTripContextAndPersist = function(tripName) {
  const trip = this.getTrip(tripName);
  if(!trip) throw new Error(`setTripContextAndPersist: cannot find trip ${tripName} [encoded: ${TripData.encode(tripName)}] in session ${this.sessionId}, fbid ${this.fbid}`);
  this.tripNameInContext = trip.tripName;
  // logger.debug(`setTripContextAndPersist: setting raw trip name to ${trip.data.rawName}`);
  this.rawTripNameInContext = trip.data.rawName;
  // Persist the new trip that was added to this session.
  // logger.debug(`setTripContextAndPersist: set trip context for this session as ${this.tripNameInContext}. persisting session`);
  this.persistSession();
}

Session.prototype.addTrip = function(tripName) {
  const trip = new TripData(tripName, this.fbid);
  const encTripName = trip.tripName;
  // logger.debug(`addTrip: encTripName: ${encTripName}; dump of trip ${tripName}: ${JSON.stringify(trip)}`);
	// TODO: this is data leak. fix it by calling TripData.addTripDetailsAndPersist after making sure that it does not cause any side effects.
	if(this.hometown) trip.data.leavingFrom = TripData.encode(this.hometown);
  if(!this.trips[encTripName]) {
    // this is only possible in case of a new trip created in this session. 
    // logger.info(`Creating new trip for session ${this.fbid} for trip ${encTripName}`);
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
      tripData: trip
    };
    // typically, when a trip is added to the session, that is also the trip in context that the user wants to discuss.
    this.setTripContextAndPersist(encTripName); 
    this.trips[encTripName].tripData.persistUpdatedTrip();
  }
  return this.trips[encTripName].tripData;
}

// called from webpage-handler.js.addTravelers to add a new trip to friends' session. TODO: Figure out if this is working as expected. Also, see if this duplicates addTrip function above.
Session.prototype.addNewTrip = function(tripName, trip) {
  if(!tripName) {
    logger.warn("addNewTrip: undefined or null tripName. Cannot add new trip to session.");
    return;
  }
  // copy the trip into this user's trips
  new TripData(trip.rawTripName, this.fbid).copyFrom(trip);
  // finally, update session and persist
  const encTripName = TripData.encode(tripName);
  this.trips[encTripName] = trip;
  this.persistSession();
}

Session.prototype.findTrip = function() {
  if(!this.tripNameInContext) {
    logger.error(`findTrip: No tripNameInContext session ${this.sessionId} and fbid ${this.fbid}`);
    return null;
  }
  return this.getTrip(this.tripNameInContext);
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
  if(!tripName) {
    logger.debug(`getTrip: null or undefined tripName was passed`);
    return null;
  }
  if(!this.trips[TripData.encode(tripName)]) {
    // there is a possibility that the trip was added by a different process (Example: boarding-pass-handler.js). sync from persistent store to see if that's the case
    sync.call(this);
    if(!this.trips[TripData.encode(tripName)]) {
      logger.error(`getTrip: could not find trip ${TripData.encode(tripName)} in this.trips in session ${this.sessionId} with fbid ${this.fbid}. The trip is not present even in persistent store!`);
      return null;
    }
  }
  const trip = this.trips[TripData.encode(tripName)];
  // see if the tripData was invalidated and refresh it if it was.
  if(!trip.tripData) {
    trip.tripData = new TripData(tripName, this.fbid);
    logger.info(`getTrip: tripData was invalidated for trip ${tripName}. Refreshing it by creating new TripData object`);
  };
  return trip.tripData;
}

// TODO: Fix ME. this always return PST/PDT now. Obtain the timezone from the hometown.
Session.prototype.getTimezone = function() {
  return "America/Los_Angeles"; // Using the timezone understood by moment-timezone
}


/********************* TESTING APIs ****************/

Session.prototype.testing_delete = function() {
  const newfile = `${Session.sessionBaseDir}/oldFiles/${filename.call(this)}`;
  fs.renameSync(file.call(this), newfile);
}

/********************* TESTING APIs ****************/


module.exports = Session;
