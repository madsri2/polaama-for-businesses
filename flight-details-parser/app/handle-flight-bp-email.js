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
