'use strict'
const fs = require('fs');
const FbidHandler = require('fbid-handler/app/handler');
const airportCodes = require('airport-codes');
const moment = require('moment');

const baseDir = `/home/ec2-user`;
const logger = require(`${baseDir}/my-logger`);
const Sessions = require(`${baseDir}/sessions`);
const TripData = require(`${baseDir}/trip-data`);

// use a mailparser like https://www.npmjs.com/package/mailparser to parse email
function BoardingPassHandler(options) {
  // TODO: Confirm that dep_date is of the form YYYY-MM-HH
  options.departureTime = `${options.dep_date}T${options.dep_time}`;
  this.dep_date = options.dep_date;
  this.dep_time = options.dep_time;
  this.details = {
    full_name: options.name,
    pnr_number: options.pnr,
    flight_number: options.flight_num,
    departure_airport: {
      airport_code: options.dep_code,
      city: options.dep_city
    },
    arrival_airport: {
      airport_code: options.arr_code,
      city: options.arr_city
    },
    flight_schedule: {
      departure_time: options.departureTime
    }
  };
  validateFields.call(this);
}

/* 
We need a way to map the details of this boarding pass with a user profile (session) and an associated trip. The plan I have to do this is a little clunky:
1) Get the name of the passenger from boarding pass and see if you can find it in fbid-handler.js. If we cannot find it, then simply fail. The email has been stored, so it's not lost. The first time Polaama gets a message from a user, fbid-handler is updated with the corresponding fbid and the name associated with the facebook id.
2) From the destination of the boarding pass and the departure date (which would be start date), guess the trip by comparing this information with all trips for the session. If we don't find it, then create a new trip.
3) Once we have trip information: 
  a) Call flightDetailsParser.parse to validate the details, store it in a file 
  b) mark the corresponding trip's "flight ticket" activity as done
  c) Notify the user via chat that we have the boarding pass and we will send notification + boarding pass a day before trip.
*/
BoardingPassHandler.prototype.handle = function() {
  // 1) Get the fbid and session corresponding to the name
  this.session = getSession.call(this);

  // get city corresponding to destination airport code
  const airportCode = this.details.arrival_airport.airport_code;
  const destCity = airportCodes.findWhere({iata: `${airportCode}`}).get('city');
  if(!destCity) throw new Error(`handle: cannot find city for code ${code}`);

  // 2) Now, get the trip corresponding to this trip or create a new trip
  const trips = this.session.allTrips();
  const tripCount = trips ? trips.length : 0;
  logger.debug(`handle: There are ${tripCount} future trips in session`);
  for(let idx = 0; idx < tripCount; idx++) {
    const trip = trips[idx];
    const tripData = trip.data;
    if(moment(this.dep_date).isSame(tripData.startDate)) {
      logger.debug(`handle: departure date from boarding pass matches trip ${tripData.rawName}'s startDates`);
      if(trip.comparePortOfEntry(destCity)) {
        logger.debug(`handle: Found trip ${tripData.name} that matches port of entry of boarding pass`);
        this.trip = trip;
        break;
      }
    } 
  }
  if(!this.trip) {
    logger.debug(`Could not find an existing trip that matches startDate and port of entry. Creating new trip for destCity ${destCity}`);
    this.trip = this.session.addTrip(destCity);
    const tripDetails = {
      startDate: this.dep_date,
      portOfEntry: destCity,
      destination: destCity // if the user is traveling to only one city, the destination & port of entry will be the same
    };
    this.trip.addTripDetailsAndPersist(tripDetails);
  }

  // 3) Store itinerary + boarding pass information
  try {
    const file = this.trip.boardingPassFile();
    logger.debug(`handle: Writing to file ${file}`);
    fs.writeFileSync(file, JSON.stringify(this.details));
    // send a notification to the user that we have their details and will send them the boarding pass the day before the flight.
    this.trip.markTodoItemDone("flight tickets");
    // notify user that we have received a boarding pass.
    // callSendAPI(`Received boarding pass for your trip to ${this.trip.destination}. Will automatically send you the boarding pass two days before the trip`);
  }
  catch(e) {
    logger.error(`parse: Error writing to file ${this.trip.boardingPassFile()}. ${e.stack}`);
    throw e;
  }
  logger.debug(`handle: Stored flight details, marked todo item as done and pushed notification`);
  return true;
}

function getSession() {
  const name = this.details.full_name;
  const fbidHandler = new FbidHandler();
  const fbid = fbidHandler.fbid(name);
  if(!fbid) throw new Error(`Could not get the fbid corresponding to name \"${name}\". Maybe the user never initiated a chat conversation with polaama?`);

  this.fbid = fbid;
  logger.debug(`getSession: fbid for this handler is ${fbid}`);
  const sessions = new Sessions();
  const session = sessions.find(fbid);
  if(!session) throw new Error(`Could not find session for fbid ${fbid}. Maybe user never initiated a chat conversation with polaama?`);

  logger.debug(`getSession: Found session ${JSON.stringify(session)}`);
  return session;
}

// ensure that required fields are present. If they are not present, throw an exception
function validateFields() {
  const requiredFields = ['full_name', 'pnr_number', 'flight_number', 'departure_airport', 'arrival_airport', 'flight_schedule'];
  const airportFields = ['airport_code', 'city'];
  const flightScheduleFields = ['departure_time'];
  requiredFields.forEach(field => {
    if(!this.details[field]) {
      throw new Error(`Required field ${field} missing in details`);
    }
  });
  airportFields.forEach(field => {
    if(!this.details.departure_airport[field]) {
      throw new Error(`Required field ${field} missing in details.departure_airport`);
    }
  });
  airportFields.forEach(field => {
    if(!this.details.arrival_airport[field]) {
      throw new Error(`Required field ${field} missing in details.arrival_airport`);
    }
  });
  flightScheduleFields.forEach(field => {
    if(!this.details.flight_schedule[field]) {
      throw new Error(`Required field ${field} missing in details.flight_schedule`);
    }
    // TODO: validate that the departure_time is in the ISO 8601-based format (YYYY-MM-DDThh:mm)
    // https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-boardingpass-template
  });
}

module.exports = BoardingPassHandler;
