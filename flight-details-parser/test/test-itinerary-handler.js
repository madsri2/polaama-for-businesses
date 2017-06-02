'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const ItineraryHandler = require('flight-details-parser/app/itinerary-handler');
const FbidHandler = require('fbid-handler/app/handler');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
const sessions = require(`${baseDir}/sessions`).get();
logger.setTestConfig(); // indicate that we are logging for a test

describe('ItineraryHandler tests', function() {
  let fbid = "12345";
  let tripName = "New York";
  // set up
  beforeEach(function() {
    // create a test file and pass that to fbid-handler
    logger.debug("Setting up before test");
    FbidHandler.get('fbid-test.txt').testing_add(fbid,{first_name: "TestFirstname", last_name: "Lastname"});
    sessions.findOrCreate(fbid);
  });

  // clean up
  afterEach(function() {
    logger.debug("Cleaning up after test");
    // not deleting fbid because it can be reused and we want to avoid creating a new encoded Fbid everytime.
    // (FbidHandler.get('fbid-test.txt')).testing_delete(fbid);
    sessions.testing_delete(fbid);
    (new TripData(tripName, fbid)).testing_delete();
  });

  function getItinerary() {
    const trip = new TripData(tripName, fbid);
    const itin = JSON.parse(fs.readFileSync(trip.itineraryFile(), 'utf8'));
    return {
      itin: itin,
      trip: trip
    };
  }

  function verifyFirstConnection() {
    const obj = getItinerary();
    const itin = obj.itin;
    const trip = obj.trip;
    verifyFlightInfo(itin, itin.flight_info[0]);
    verifyPassengerInfo(itin, itin.passenger_info[0]);
    verifyPassengerSegment(itin, itin.passenger_segment_info[0]);
    expect(itin.pnr_number[0]).to.equal("CA242V");
    expect(itin.total_price).to.equal("1700.56");
    expect(itin.currency).to.equal("USD");
    // verify that "flight ticket" todo item was marked done
    expect(trip.getTodoDoneList()).to.include("Flight tickets");
  }

  /*
  function verifySecondConnection() {
    const obj = getItinerary();
    const itin = obj.itin;
    const trip = obj.trip;
    verifyFlightInfo(itin, itin.flight_info, options, idx);
    verifyPassengerInfo(itin, itin.passenger_info, options, idx);
    verifyPassengerSegment(itin, itin.passenger_segment_info, options, idx);
  }
  */

  // TODO: verify passenger_segment_info. There needs to be same number of seats and seat_types as passengers for each flight.
  function verifyPassengerSegment(itin, passengerSegment) {
    expect(passengerSegment.segment_id).to.equal("s001");
    expect(passengerSegment.passenger_id).to.equal("p001");
    expect(passengerSegment.seat).to.equal("35J");
    expect(passengerSegment.seat_type).to.equal("economy");
  }

  function verifyFlightInfo(itin, flightInfo) {
    expect(flightInfo.connection_id).to.equal("c001");
    expect(flightInfo.segment_id).to.equal("s001");
    expect(flightInfo.travel_class).to.equal("economy");
    expect(flightInfo.departure_airport.airport_code).to.equal("SEA");
    expect(flightInfo.arrival_airport.airport_code).to.equal("JFK");
    expect(flightInfo.flight_schedule.departure_time).to.equal("2017-5-1T10:10");
  }

  function verifyPassengerInfo(itin, passengerInfo) {
    expect(passengerInfo.name).to.equal("TestFirstName LastName");
    expect(passengerInfo.passenger_id).to.equal("p001");
  }

  function verifyTripInContext() {
    const session = sessions.find(fbid);
    const trip = getItinerary().trip;
    expect(session.tripNameInContext).to.equal(trip.data.name);
  }
  
  it('single itinerary', function() {
    const options = {
      dep_date: '5/1/17',
      names: ["TestFirstName LastName"],
      flight_num: ['UA123'],
      pnr: ['CA242V'],
      travel_class: ['economy'],
      boarding_time: ['09:15'],
      dep_time: ['10:10'],
      dep_code: ['SEA'],
      dep_city: ['Seattle'],
      arr_code: ['JFK'],
      arr_city: [tripName],
      arrival_time: ['14:15'],
      UA123_seats: ['35J'],
      total_price: "1700.56",
      currency: "USD"
    };
    expect(new ItineraryHandler(options, true /* testing */).handle()).to.be.ok; 
    verifyFirstConnection();
    verifyTripInContext();
  });

  it.skip('single passenger multiple itineraries', function() {
    const tName = 'Amsterdam';
    const options = {
      dep_date: '5/1/17',
      names: ["TestFirstName LastName", "first last"],
      flight_num: ['UA123', 'CA35'],
      pnr: ['CA242V', 'XDS45Z'],
      travel_class: ['economy', 'business'],
      boarding_time: ['09:15', '15:30'],
      dep_time: ['10:10', '17:00'],
      dep_code: ['SEA', 'JFK'],
      dep_city: ['Seattle', 'New York'],
      arr_code: ['JFK', 'AMS'],
      arr_city: ['New York', tName], // not using tripName because we are using a different name
      arrival_time: ['14:15', '23:00'],
      UA123_seats: ['35J', '4A'],
      total_price: "1700.56",
      currency: "USD"
    };
    expect(new ItineraryHandler(options, true /* testing */).handle()).to.be.ok; 
    verifyFirstConnection();
    // verifySecondConnection();
  });

  it("return flight itinerary for existing trip", function() {
    const session = sessions.find(fbid);
    session.addTrip(tripName);
    const trip = session.getTrip(tripName);
    const startDate = "5/1/17";
    trip.addTripDetailsAndPersist({ startDate: startDate, portOfEntry: tripName, leavingFrom: "San Francisco"});
    const options = {
      dep_date: '5/10/17',
      names: ["TestFirstName LastName"],
      flight_num: ['UA123'],
      pnr: ['CA242V'],
      travel_class: ['economy'],
      boarding_time: ['09:15'],
      dep_time: ['10:10'],
      dep_code: ['JFK'],
      dep_city: [tripName],
      arr_code: ['SFO'],
      arr_city: ['San Francisco'],
      arrival_time: ['14:15'],
      UA123_seats: ['35J'],
      total_price: "400.56",
      currency: "USD"
    };
    expect(new ItineraryHandler(options, true /* testing */).handle()).to.be.ok; 
    const returnTrip = new TripData(tripName, fbid);
    expect(fs.existsSync(returnTrip.returnFlightFile())).to.be.ok;
    const itin = JSON.parse(fs.readFileSync(trip.returnFlightFile(), 'utf8'));
    const flightInfo = itin.flight_info[0];
    expect(flightInfo.departure_airport.airport_code).to.equal("JFK");
    expect(flightInfo.arrival_airport.airport_code).to.equal("SFO");
    expect(flightInfo.flight_schedule.departure_time).to.equal("2017-5-10T10:10");
  });

  it.skip('multiple passengers multiple itineraries', function() {
  });

  it('verify that itinerary is tripInContext', function() {
    const session = sessions.find(fbid);
    session.addTrip(tripName);
    const trip = session.getTrip(tripName);
    const startDate = "5/1/17";
    trip.addTripDetailsAndPersist({ startDate: startDate, portOfEntry: tripName });
    // now add another trip to session to change trip name in context
    session.addTrip("anotherTrip");
    expect(session.tripNameInContext).to.equal("anothertrip");
    const options = {
      dep_date: startDate,
      names: ["TestFirstName LastName"],
      flight_num: ['UA123'],
      pnr: ['CA242V'],
      travel_class: ['economy'],
      boarding_time: ['09:15'],
      dep_time: ['10:10'],
      dep_code: ['SEA'],
      dep_city: ['Seattle'],
      arr_code: ['JFK'],
      arr_city: [tripName],
      arrival_time: ['14:15'],
      UA123_seats: ['35J'],
      total_price: "1700.56",
      currency: "USD"
    };
    expect(new ItineraryHandler(options, true /* testing */).handle()).to.be.ok; 
    verifyFirstConnection();
    verifyTripInContext();
  });

});
