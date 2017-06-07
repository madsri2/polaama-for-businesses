'use strict';

const moment = require('moment');
const FbidHandler = require('fbid-handler/app/handler');

const baseDir = `/home/ec2-user`;
const Sessions = require(`${baseDir}/sessions`);
const TripData = require(`${baseDir}/trip-data`);
const logger = require(`${baseDir}/my-logger`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);

// Class to find trip associated with an itinerary or boarding pass. If there is no associated trip, create a new trip and return it.
function TripFinder(name, testing) {
  this.name = name;
	this.testing = testing;

  // 1) Get fbid and session corresponding to the name
  this.session = this.getSession();
	this.postHandler = new WebhookPostHandler(this.session, this.testing);

  // 2) Now, get the trip corresponding to this trip or create a new trip
  this.trips = this.session.allTrips();
  this.tripCount = this.trips ? this.trips.length : 0;
  logger.debug(`TripFinder: There are ${this.tripCount} future trips in session`);
}

TripFinder.prototype.getPostHandler = function() {
	return this.postHandler;
}

TripFinder.prototype.getSession = function() {
  if(this.session) return this.session;
  const name = this.name;
  const fbidHandler = FbidHandler.get();
  const fbid = fbidHandler.fbid(name);
  if(!fbid) throw new Error(`Could not get the fbid corresponding to name \"${name}\". Maybe the user never initiated a chat conversation with polaama?`);
  this.fbid = fbid;
  this.sessions = Sessions.get();
  const session = this.sessions.find(fbid);
  if(!session) throw new Error(`Could not find session for fbid ${fbid}. Maybe user never initiated a chat conversation with polaama?`);
  logger.debug(`getSession: Found session ${session.sessionId} with fbid ${fbid}`);
  return session;
}

/* 
We need a way to map the details of this boarding pass with a user profile (session) and an associated trip. The plan I have to do this is a little clunky:
1) Get the name of the passenger from boarding pass and see if you can find it in fbid-handler.js. If we cannot find it, then simply fail. The email has been stored, so it's not lost. The first time Polaama gets a message from a user, fbid-handler is updated with the corresponding fbid and the name associated with the facebook id.
2) From the destination of the boarding pass and the departure date (which would be start date), guess the trip by comparing this information with all trips for the session. If we don't find it, then create a new trip.
*/
TripFinder.prototype.getTrip = function(departureDate, destCity, leavingFrom) {
  const trips = this.trips;
  const tripCount = this.tripCount;

  let myTrip;
  for(let idx = 0; idx < tripCount; idx++) {
    const trip = trips[idx];
    const tripData = trip.data;
    logger.debug(`getTrip: found trip ${trip.tripName}. checking to see if it matches itinerary.`);
    if(!tripData.startDate || tripData.startDate === "unknown") {
      logger.debug(`getTrip: No start date for trip ${trip.tripName} for fbid ${this.fbid}. skipping this trip.`);
      continue;
    }
    const tripStartDate = moment(new Date(tripData.startDate).toISOString());
		logger.debug(`getTrip: departureDate value is ${departureDate}`);
    if(moment(new Date(departureDate).toISOString()).isSame(tripStartDate) && trip.comparePortOfEntry(destCity)) {
      logger.debug(`getTrip: found trip ${tripData.name} that matches port of entry ${destCity} and departure date ${tripStartDate} of boarding pass`);
      myTrip = trip;
      break;
    } 
    // if the itinerary that was passed is leaving from portOfEntry and returning to the home town of this trip, then this is the trip and this itinerary contains the return trip details.
    if(trip.comparePortOfEntry(leavingFrom) && trip.isLeavingFrom(destCity)) {
			logger.debug(`getTrip: found trip ${tripData.name} for which this itinerary is the return flight details`);
      myTrip = trip;
      this.returnFlightItinerary = true;
      break;
    }
  }
  if(myTrip) {
    this.session.setTripContextAndPersist(myTrip.tripName);
    return myTrip;
  }
	return createNewTrip.call(this, destCity, departureDate, leavingFrom);
}

// used by receipt-managers (car & hotel), which won't have departure dates
TripFinder.prototype.getTripForReceipt = function(receiptDate, destCity) {
  let myTrip;
  for(let idx = 0; idx < this.tripCount; idx++) {
    const trip = this.trips[idx];
    const tripData = trip.data;
    logger.debug(`getTrip: found trip ${trip.tripName}. checking to see if it matches itinerary.`);
    // nothing to do if the cities don't match.
    if(!trip.comparePortOfEntry(destCity)) break;
    logger.debug(`getTrip: found trip that matches city ${destCity}. Checking dates`);
    // If the doesn't have a start date, then, it might be the trip (unless there is no other trip with the same name but with a start date).
    if(!tripData.startDate) {
      logger.debug(`getTrip: No start date for trip ${trip.tripName} for fbid ${this.fbid}. skipping this trip but marking it as a potential trip`);
      this.potentialTrip = tripData;
      continue;
    }
    // if receipt date is in between start date and return date, this is the trip
    const tripStartDate = moment(new Date(tripData.startDate).toISOString());
    if(tripData.returnDate && tripData.returnDate != "unknown") {
      const mReturnDate = moment(new Date(tripData.returnDate).toISOString());
      const mReceiptDate = moment(new Date(receiptDate).toISOString());
      if(mReceiptDate.isBetween(tripStartDate, mReturnDate)) {
        logger.debug(`getTrip: trip ${tripData.name} is a match. receipt date ${mReceiptDate} is in between trip's start date and return date`);
        myTrip = trip;
        break;
      }
      else continue; // this is not the trip.
    }
		logger.debug(`comparing <${receiptDate}>, ${new Date(receiptDate)} and ${tripStartDate}`);
    // if receipt date is after start date and there is no return date, this is the trip
    if(moment(new Date(receiptDate).toISOString()).isAfter(tripStartDate)) {
      logger.debug(`getTrip: found trip ${tripData.name} that matches port of entry ${destCity} and departure date ${tripStartDate} of boarding pass`);
      myTrip = trip;
      break;
    } 
  }
  if(myTrip) {
    this.session.setTripContextAndPersist(myTrip.tripName);
    return myTrip;
  }
	logger.info(`getTripForReceipt: using receipt date ${receiptDate} as the start date for new trip because we don't have a start date`);
  return createNewTrip.call(this, destCity, receiptDate);
}

function createNewTrip(destCity, departureDate, leavingFrom) {
  logger.debug(`getTrip: could not find an existing trip that matches startDate and port of entry. Creating new trip for destCity ${destCity}`);
  const myTrip = this.session.addTrip(destCity);
  const tripDetails = {
    destination: destCity // if the user is traveling to only one city, the destination & port of entry will be the same
  };
	if(departureDate) tripDetails.startDate = departureDate;
	if(leavingFrom) tripDetails.leavingFrom = leavingFrom;
  myTrip.addTripDetailsAndPersist(tripDetails);
  myTrip.addPortOfEntry(destCity);

	return myTrip;
}

module.exports = TripFinder;
