'use strict'
const fs = require('fs');

const baseDir = `/home/ec2-user`;
const logger = require(`${baseDir}/my-logger`);

// use a mailparser like https://www.npmjs.com/package/mailparser to parse email
function Parser(trip) {
  this.trip = trip;
}

// parse the email information and store details in file.
Parser.prototype.parse = function(details) {
  validateFields.call(this, details);
  try {
    fs.writeFileSync(this.trip.boardingPassFile(), JSON.stringify(details));
  }
  catch(e) {
    logger.error(`parse: Error writing to file ${this.trip.boardingPassFile()}. ${e.stack}`);
    throw e;
  }
  return true;
}

Parser.prototype.parseMail = function() {
}

// ensure that required fields are present. If they are not present, throw an exception
function validateFields(details) {
  const requiredFields = ['full_name', 'pnr_number', 'flight_number', 'departure_airport', 'arrival_airport', 'flight_schedule'];
  const airportFields = ['airport_code', 'city'];
  const flightScheduleFields = ['departure_time'];
  requiredFields.forEach(field => {
    if(!details[field]) {
      throw new Error(`Required field ${field} missing in details`);
    }
  });
  airportFields.forEach(field => {
    if(!details.departure_airport[field]) {
      throw new Error(`Required field ${field} missing in details.departure_airport`);
    }
  });
  airportFields.forEach(field => {
    if(!details.arrival_airport[field]) {
      throw new Error(`Required field ${field} missing in details.arrival_airport`);
    }
  });
  flightScheduleFields.forEach(field => {
    if(!details.flight_schedule[field]) {
      throw new Error(`Required field ${field} missing in details.flight_schedule`);
    }
  });
}

module.exports = Parser;
