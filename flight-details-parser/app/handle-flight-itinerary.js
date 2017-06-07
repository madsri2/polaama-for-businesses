'use strict';
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');
const ItineraryHandler = require('flight-details-parser/app/itinerary-handler');

const optionsDefn = [
  {name: 'names', alias: 'n', multiple: true}, // default type: String
  {name: 'pnr', alias: 'p'}, // TODO: Add a type: Function to validate that the confirmation code is as expected
  {name: 'flight_num', alias: 'f', multiple: true},
  {name: 'dep_code', alias: 'd', multiple: true},
  {name: 'dep_city', alias: 'e', multiple: true},
  {name: 'arr_code', alias: 'a', multiple: true},
  {name: 'arr_city', alias: 'b', multiple: true},
  {name: 'dep_time', alias: 't', multiple: true},
  {name: 'departure_time', multiple: true},
  {name: 'dep_date', alias: 'u', multiple: true},
  {name: 'seats', alias: 's', multiple: true},
  {name: 'boarding_time', multiple: true},
  {name: 'arrival_time', multiple: true},
  {name: 'total_price'},
  {name: 'currency', defaultValue: 'USD'},
  {name: 'travel_class', defaultValue: 'economy', multiple: true}
];

// TODO: Start here and add departure time
const options = cmdLineArgs(optionsDefn);
console.log(`options: ${JSON.stringify(options)}`);
const itinHandler = new ItineraryHandler(options);
itinHandler.handle();
