'use strict';
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');

const baseDir = "/home/ec2-user";
const TripData = require(`${baseDir}/trip-data`);
const Parser = require('flight-details-parser/app/parser');

// read details as a list of parameters, call parse to store the infromation, mark "Get flight" todo item as done.

const optionsDefn = [
  {name: 'trip', alias: 'r'},
  {name: 'name', alias: 'n'}, // default type: String
  {name: 'pnr', alias: 'p'}, // TODO: Add a type: Function to validate that the confirmation code is as expected
  {name: 'flight_num', alias: 'f'},
  {name: 'dep_code', alias: 'd'},
  {name: 'dep_city', alias: 'e'},
  {name: 'arr_code', alias: 'a'},
  {name: 'arr_city', alias: 'b'},
  {name: 'dep_time', alias: 't'}
];

const options = cmdLineArgs(optionsDefn);
const details = {
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
    departure_time: options.dep_time
  }
};

/* We need a way to map the details of this boarding pass with a user profile (session) and an associated trip. The current way to do this is a little clunky:
1) Get the name of the passenger from boarding pass and see if you can find it in fbid-handler.js. If we cannot find it, then simply fail. The email has been stored, so it's not lost. The first time Polaama gets a message from a user, fbid-handler is updated with the corresponding fbid and the name associated with the facebook id.
2) From the destination of the boarding pass, guess the trip (look for any trip with the name that maps the destination and the start date that maps the one found in the boarding pass). If we don't find a trip, see if the destination city maps to a country and the associated start date. If we don't find a trip, then create a new trip.

const trip = new TripData(options.trip);
if(!trip.data.startDate) {
  throw new Error(`Trip ${trip.data.name} does not have startDate. Polaama does not know about this trip`);
}
const parser = new Parser(trip);
if(parser.parse(details)) {
  // trip.markTodoItemDone("flight tickets");
}
else {
  throw new Error("Error parsing flight details information");
}

console.log("Stored flight details and marked flight tickets todo item as done");
