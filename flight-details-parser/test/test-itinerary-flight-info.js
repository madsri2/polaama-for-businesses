'use strict';
const expect = require('chai').expect;
const should = require('chai').should();
const moment = require('moment');
const ItineraryFlightInfo = require('flight-details-parser/app/itinerary-flight-info');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe('itinerary flight info tests', function() {
  function verifyFirstConnection(result) {
    expect(result.connection_id).to.equal("c001");
    expect(result.segment_id).to.equal("s001");
    expect(Object.keys(result.departure_airport).length).to.equal(2);
    expect(Object.keys(result.arrival_airport).length).to.equal(2);
    expect(Object.keys(result.flight_schedule).length).to.equal(3);
    expect(result.travel_class).to.equal("economy");
    expect(result.flight_schedule.arrival_time).to.equal(moment("2017-05-01T14:15").format("YYYY-MM-DDTHH:mm"));
    expect(result.flight_schedule.departure_time).to.equal(moment("2017-05-01T10:10").format("YYYY-MM-DDTHH:mm"));
    expect(result.flight_schedule.boarding_time).to.equal(moment("2017-05-01T09:15").format("YYYY-MM-DDTHH:mm"));
  }

  it('single flight', function() {
    const options = {
      dep_date: '5/1/17',
      flight_num: ['UA123'],
      travel_class: ['economy'],
      boarding_time: ['09:15'],
      dep_time: ['10:10'],
      dep_code: ['SEA'],
      dep_city: ['Seattle'],
      arr_code: ['JFK'],
      arr_city: ['New York'],
      arrival_time: ['2017-05-01T14:15']
    };
    const parsedDetails = new ItineraryFlightInfo(options).get();
    expect(parsedDetails.length).to.equal(1);
    verifyFirstConnection(parsedDetails[0]);
  });

  it('multiple flights', function() {
    const options = {
      dep_date: '5/1/17',
      flight_num: ['UA123', 'VA345'],
      travel_class: ['economy', 'business'],
      boarding_time: ['09:15', '15:45'],
      dep_time: ['10:10', '16:30'],
      dep_code: ['SEA', 'JFK'],
      dep_city: ['Seattle', 'New York'],
      arr_code: ['JFK', 'AMS'],
      arr_city: ['New York', 'Amsterdam'],
      arrival_time: ['14:15', '21:00']
    };
    const parsedDetails = new ItineraryFlightInfo(options).get();
    expect(parsedDetails.length).to.equal(2);
    verifyFirstConnection(parsedDetails[0]);
    expect(parsedDetails[1].connection_id).to.equal("c002");
    expect(parsedDetails[1].segment_id).to.equal("s002");
  });
});
