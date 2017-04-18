'use strict';
// https://www.npmjs.com/package/command-line-args
const cmdLineArgs = require('command-line-args');
const BoardingPassHandler = require('flight-details-parser/app/boarding-pass-handler');

const optionsDefn = [
  {name: 'name', alias: 'n'}, // default type: String
  {name: 'pnr', alias: 'p'}, // TODO: Add a type: Function to validate that the confirmation code is as expected
  {name: 'flight_num', alias: 'f'},
  {name: 'dep_code', alias: 'd'},
  {name: 'dep_city', alias: 'e'},
  {name: 'arr_code', alias: 'a'},
  {name: 'arr_city', alias: 'b'},
  {name: 'dep_time', alias: 't'}
  {name: 'dep_date', alias: 'u'}
];

// TODO: Start here and add departure time
const options = cmdLineArgs(optionsDefn);
const bpHandler = new BoardingPassHandler(options);
bpHandler.handle();
