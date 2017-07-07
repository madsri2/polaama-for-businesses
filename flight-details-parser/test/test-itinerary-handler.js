'use strict';

const expect = require('chai').expect;
const fs = require('fs');
const ItineraryHandler = require('flight-details-parser/app/itinerary-handler');
const FbidHandler = require('fbid-handler/app/handler');
const moment = require('moment');

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
    tripName = "New York";
    // create a test file and pass that to fbid-handler
    logger.debug("Setting up before test");
    FbidHandler.get('fbid-test.txt').testing_add(fbid,{first_name: "TestFirstname", last_name: "Lastname"});
    FbidHandler.get('fbid-test.txt').testing_add("123456",{first_name: "first", last_name: "last"});
    sessions.findOrCreate(fbid);
    sessions.findOrCreate("123456");
  });

  // clean up
  afterEach(function() {
    logger.debug("Cleaning up after test");
    // not deleting fbid because it can be reused and we want to avoid creating a new encoded Fbid everytime.
    // (FbidHandler.get('fbid-test.txt')).testing_delete(fbid);
    sessions.testing_delete(fbid);
    (new TripData(tripName, fbid)).testing_delete();
    sessions.testing_delete("123456");
    (new TripData(tripName, "123456")).testing_delete();
  });

  function getItinerary(tName) {
    let nameOfTrip = tName;
    if(!nameOfTrip) nameOfTrip = tripName; 
    const trip = new TripData(nameOfTrip, fbid);
    const itin = JSON.parse(fs.readFileSync(trip.itineraryFile(), 'utf8'));
    return {
      itin: itin,
      trip: trip
    };
  }

  function verifyFirstConnection(tName) {
    const obj = getItinerary(tName);
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

  function verifySecondConnection(tName) {
    const obj = getItinerary(tName);
    const itin = obj.itin;
    const trip = obj.trip;
    flightInfoCheck(itin.flight_info[1], "CA35", "c002", "s002", "JFK", "AMS", "2017-05-01T17:00", null, "business");
    passengerInfoCheck(itin.passenger_info[0], "TestFirstName LastName", "p001");
    passengerSegmentCheck(itin.passenger_segment_info[1], "s002", "p001", "4A", "business");
  }

  // TODO: verify passenger_segment_info. There needs to be same number of seats and seat_types as passengers for each flight.
  function verifyPassengerSegment(itin, passengerSegment) {
    passengerSegmentCheck(passengerSegment, "s001", "p001", "35J");
  }

  function verifyFlightInfo(itin, flightInfo) {
    flightInfoCheck(flightInfo, "UA123", "c001", "s001", "SEA", "JFK", "2017-05-01T10:10");
  }

  function verifyPassengerInfo(itin, passengerInfo) {
    passengerInfoCheck(passengerInfo, "TestFirstName LastName", "p001");
  }

  function verifyTripInContext() {
    const session = sessions.find(fbid);
    const trip = getItinerary().trip;
    expect(session.tripNameInContext).to.equal(trip.data.name);
  }
  
  it('single itinerary', function(done) {
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
      seats: ['35J'],
      total_price: "1700.56",
      currency: "USD"
    };
		const promise = new ItineraryHandler(options, true /* testing */).handle();
		promise.done(
			function(response) {
				const trip = getItinerary().trip;
				const itin = JSON.parse(fs.readFileSync(trip.tripItinFile(), 'utf8'));
				const dayItin = itin["5/1/2017"];
				expect(dayItin.startTime).to.equal("10:10");
				expect(dayItin.arrivalTime).to.equal("14:15");
				done();
			},
			function(err) {
				done(err);	
			}
		);
    verifyFirstConnection();
    verifyTripInContext();
  });

  it('single passenger multiple itineraries', function() {
    const tName = 'Amsterdam';
    const options = {
      dep_date: '5/1/17',
      names: ["TestFirstName LastName"],
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
      seats: ['35J', '4A'],
      total_price: "1700.56",
      currency: "USD"
    };
    new ItineraryHandler(options, true /* testing */).handle();
    verifyFirstConnection(tName);
    verifySecondConnection(tName);
    (new TripData(tName, fbid)).testing_delete();
  });

  function verifyMPMIDTCTest(tName, firstPsngr, secondPsngr) {
    verifyFirstConnection(tName);
    // second connection for passenger 1
    const obj = getItinerary(tName);
    const itin = obj.itin;
    const trip = obj.trip;
    flightInfoCheck(itin.flight_info[1], "CA35", "c002", "s002", "JFK", "AMS", "2017-05-01T17:00", null, "economy");
    passengerInfoCheck(itin.passenger_info[0], "TestFirstName LastName", "p001");
    passengerSegmentCheck(itin.passenger_segment_info[1], "s002", "p001", "4A", "business");
    // first connection for passenger 2
    passengerInfoCheck(itin.passenger_info[1], "First Last", "p002");
    passengerSegmentCheck(itin.passenger_segment_info[2], "s001", "p002", "36J", "economy");
    // second connection for passenger 2
    passengerSegmentCheck(itin.passenger_segment_info[3], "s002", "p002", "36J", "economy");
  }

  it('multiple passengers multiple itineraries different travel class', function() {
    const tName = 'Amsterdam';
    const options = {
      dep_date: '5/1/17',
      names: ["TestFirstName LastName", "First Last"],
      flight_num: ['UA123', 'CA35'],
      pnr: ['CA242V', 'XDS45Z'],
      travel_class: ['economy', 'economy', 'business', 'economy'],
      boarding_time: ['09:15', '15:30'],
      dep_time: ['10:10', '17:00'],
      dep_code: ['SEA', 'JFK'],
      dep_city: ['Seattle', 'New York'],
      arr_code: ['JFK', 'AMS'],
      arr_city: ['New York', tName], // not using tripName because we are using a different name
      arrival_time: ['14:15', '23:00'],
      seats: ['35J', '36J', '4A', '36J'],
      total_price: "1700.56",
      currency: "USD"
    };
    new ItineraryHandler(options, true /* testing */).handle();
    verifyMPMIDTCTest(tName);
    (new TripData(tName, fbid)).testing_delete();
  });


  function passengerSegmentCheck(passengerSegment, segId, pasId, seat, travelClass) {
    expect(passengerSegment.segment_id).to.equal(segId);
    expect(passengerSegment.passenger_id).to.equal(pasId);
    expect(passengerSegment.seat).to.equal(seat);
    if(!travelClass) travelClass = "economy";
    expect(passengerSegment.seat_type).to.equal(travelClass);
  }

  function passengerInfoCheck(passengerInfo, name, id, ticket_num) {
    expect(passengerInfo.name).to.equal(name);
    expect(passengerInfo.passenger_id).to.equal(id);
    if(ticket_num) expect(passengerInfo.ticket_number).to.equal(ticket_num);
  }

  function flightInfoCheck(flightInfo, flightNum, cid, sid, daCode, aaCode, depTime, aircraftType, travelClass) {
    expect(flightInfo.flight_number).to.equal(flightNum);
    expect(flightInfo.connection_id).to.equal(cid);
    expect(flightInfo.segment_id).to.equal(sid);
    expect(flightInfo.departure_airport.airport_code).to.equal(daCode);
    expect(flightInfo.arrival_airport.airport_code).to.equal(aaCode);
    expect(flightInfo.flight_schedule.departure_time).to.equal(moment(depTime).format("YYYY-MM-DDTHH:mm"));
    if(aircraftType) expect(flightInfo.aircraft_type).to.equal(aircraftType);
    if(!travelClass) travelClass = "economy";
    expect(flightInfo.travel_class).to.equal(travelClass);

  }

  function verifyMultipleConnections(itin) {
    // first connection
    logger.debug(`verifyMultipleConnections: itin dump ${JSON.stringify(itin)}`);
    let flightInfo = itin.flight_info[0];
    flightInfoCheck(flightInfo, "DL998", "c001", "s001", "SEA", "LAX", "2017-08-09T17:00", "Airbus");
    expect(itin.pnr_number[0]).to.equal("HNPOL6");
    // second connection
    flightInfo = itin.flight_info[1];
    flightInfoCheck(flightInfo, "DL6794", "c002", "s002", "LAX", "BNE", "2017-08-09T23:50", "Boeing 747");
    expect(itin.pnr_number[1]).to.equal("HNPOL6");
    // third connection
    flightInfo = itin.flight_info[2];
    flightInfoCheck(flightInfo, "VA39", "c003", "s003", "BNE", "POM", "2017-08-11T09:55", "Boeing 737");
    expect(itin.pnr_number[2]).to.equal("RPQMDH");

    // first passenger
    passengerInfoCheck(itin.passenger_info[0], "TestFirstName LastName", "p001", "12/45");
    passengerSegmentCheck(itin.passenger_segment_info[0], "s001", "p001", "14C");
    passengerSegmentCheck(itin.passenger_segment_info[1], "s002", "p001", "42C");
    passengerSegmentCheck(itin.passenger_segment_info[2], "s003", "p001", "16C");
    // second passenger
    passengerInfoCheck(itin.passenger_info[1], "first last", "p002", "23/567");
    passengerSegmentCheck(itin.passenger_segment_info[3], "s001", "p002", "14B");
    passengerSegmentCheck(itin.passenger_segment_info[4], "s002", "p002", "42B");
    passengerSegmentCheck(itin.passenger_segment_info[5], "s003", "p002", "16B");

    // generic
    expect(itin.total_price).to.equal("3593.68");
    expect(itin.currency).to.equal("USD");
  }

  it('multiple passengers multiple itineraries', function() {
    tripName = "Papua New Guinea";
    const options = {
      dep_date: '5/1/17',
      names: ["TestFirstName LastName", "first last"],
      ticket_number: ["12/45", "23/567"],
      flight_num: ['DL998', 'DL6794', 'VA39'],
      aircraft_type: ["Airbus", "Boeing 747", "Boeing 737"],
      pnr: ['HNPOL6', 'HNPOL6', 'RPQMDH'],
      travel_class: ["economy"],
      // dep_time: ['10:10', '17:00'],
      departure_time: ['2017-08-09T17:00', '2017-08-09T23:50', '2017-08-11T09:55'],
      dep_code: ['SEA', 'LAX', 'BNE'],
      dep_city: ['Seattle', 'Los Angeles', 'Brisbane'],
      arr_code: ['LAX', 'BNE', 'POM'],
      arr_city: ['Los Angeles', 'Brisbane', 'Papua New Guinea'],
      arrival_time: ['2017-08-09T19:45', '2017-08-11T06:50', '2017-08-11T13:15'],
      // arrival_time: ['14:15', '23:00'],
      seats: ['14C', '14B', '42C', '42B', '16C', '16B'],
      total_price: "3593.68",
      currency: "USD"
    };
    new ItineraryHandler(options, true /* testing */).handle();
    // Verify
    const obj = getItinerary("Papua New Guinea");
    const itin = obj.itin;
    const trip = obj.trip;
    verifyMultipleConnections(itin);
    // verify that "flight ticket" todo item was marked done
    expect(trip.getTodoDoneList()).to.include("Flight tickets");
  });

  it("return flight itinerary for existing trip", function(done) {
    const session = sessions.find(fbid);
    session.addTrip(tripName);
    const trip = session.getTrip(tripName);
    const startDate = "5/1/17";
    trip.addTripDetailsAndPersist({ startDate: startDate, portOfEntry: tripName, leavingFrom: "San Francisco", duration: 10});
    const flightItin = {
      "template_type":"airline_itinerary","intro_message":"Flight itinerary for your trip","locale":"en_US","pnr_number":["CA242V"],
      "passenger_info":[{"name":"TestFirstName LastName","passenger_id":"p001"}],
      "flight_info": [{
      "flight_number": "UA122",
      "departure_airport": {
        "airport_code": "SFO",
        "city": "San Francisco"
      },
      "arrival_airport": {
        "airport_code": "JFK",
        "city": "New York"
      },
      "flight_schedule": {
        "boarding_time": "2017-05-01T09:15",
        "departure_time": "2017-05-01T10:10",
        "arrival_time": "2017-05-01T14:15"
      },
      "connection_id": "c001",
      "segment_id": "s001",
      "travel_class": "economy"
      }],
      "total_price":"1700.56",
      "currency":"USD",
      "passenger_segment_info":[{"passenger_id":"p001","segment_id":"s001","seat":"35J","seat_type":"economy"}]
    };
    // set flightItin for this trip.
    logger.debug(`dump of flight itin to write to file ${trip.itineraryFile()}: ${JSON.stringify(flightItin)}`);
    fs.writeFileSync(trip.itineraryFile(), JSON.stringify(flightItin), 'utf8');
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
		const promise = new ItineraryHandler(options, true /* testing */).handle();
		promise.done(
			function(response) {
				const trip = new TripData(tripName, fbid);
				const itin = JSON.parse(fs.readFileSync(trip.tripItinFile(), 'utf8'));
				const dayItin = itin["5/10/2017"];
				expect(dayItin.startTime).to.equal("10:10");
				expect(dayItin.arrivalTime).to.equal("14:15");
				done();
			},
			function(err) {
				done(err);	
			}
		);
    const returnTrip = session.getTrip(tripName);
    expect(fs.existsSync(returnTrip.returnFlightFile())).to.be.ok;
    const itin = JSON.parse(fs.readFileSync(trip.returnFlightFile(), 'utf8'));
    const flightInfo = itin.flight_info[0];
    expect(flightInfo.departure_airport.airport_code).to.equal("JFK");
    expect(flightInfo.arrival_airport.airport_code).to.equal("SFO");
    expect(flightInfo.flight_schedule.departure_time).to.equal(moment("2017-05-10T10:10").format("YYYY-MM-DDTHH:mm"));
		expect(moment(returnTrip.data.returnDate).format("YYYY-MM-DD")).to.equal("2017-05-10");
		expect(returnTrip.data.duration).to.equal(10);
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
      seats: ['35J'],
      total_price: "1700.56",
      currency: "USD"
    };
    new ItineraryHandler(options, true /* testing */).handle();
    verifyFirstConnection();
    verifyTripInContext();
  });
});
