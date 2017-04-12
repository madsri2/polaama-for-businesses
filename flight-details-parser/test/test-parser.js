'use strict';
const expect = require('chai').expect;

const baseDir = "/home/ec2-user";
const Parser = require('flight-details-parser/app/parser');
const TripData = require(`${baseDir}/trip-data`);


describe('Testing flight details parser', function() {
  it('Testing parser', function() {
    const tripData = new TripData("test-Parser");
    const parser = new Parser(tripData);
    const details = {
      full_name: "Madhu Partha",
      pnr_number: "XWERGX",
      flight_number: "UA500",
      departure_airport: {
        airport_code: "SEA",
        city: "Seattle"
      },
      arrival_airport: {
        airport_code: "JFK",
        city: "New York"
      },
      flight_schedule: {
        departure_time: "09:00"
      }
    };
    expect(parser.parse(details)).to.be.ok;
  });
});

