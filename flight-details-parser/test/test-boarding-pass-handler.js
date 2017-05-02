'use strict';
const expect = require('chai').expect;

const BoardingPassHandler = require('flight-details-parser/app/boarding-pass-handler');
const FbidHandler = require('fbid-handler/app/handler');
const fs = require('fs');
const baseDir = "/home/ec2-user";
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test


describe('BoardingPass handler', function() {
  let fbid = "12345";
  let tripName = "New York";
  const sessions = new Sessions();
  const options = {
    name: "TestFirstName LastName",
    pnr: "XWERGX",
    flight_num: "UA500",
    dep_code: "SEA",
    dep_city: "Seattle",
    arr_code: "JFK",
    arr_city: tripName,
    dep_date: "5/1/17",
    dep_time: "09:00",
    email: "madsri2@gmail.com",
    attachment: "2017-04-20T08:18/attachment.png"
  };

  // set up
  beforeEach(function() {
    // create a test file and pass that to fbid-handler
    logger.debug("Setting up before test");
    (new FbidHandler()).testing_add(fbid,{"first_name": "TestFirstname", "last_name": "Lastname"});
    sessions.findOrCreate(fbid);
  });

  // clean up
  afterEach(function() {
    logger.debug("Cleaning up after test");
    (new FbidHandler()).testing_delete(fbid);
    sessions.testing_delete(fbid);
    (new TripData(tripName)).testing_delete();
  });

  function verifyExpectations() {
    const trip = new TripData(tripName);
    // verify that boarding pass file actually was written
    const boardingPass = JSON.parse(fs.readFileSync(trip.boardingPassFile(), 'utf8'));
    expect(boardingPass.flight_schedule.departure_time).to.equal("2017-5-1T09:00");
    expect(boardingPass.full_name).to.equal("TestFirstName LastName");
    expect(boardingPass.pnr_number).to.equal("XWERGX");
    // verify that "flight ticket" todo item was marked done
    expect(trip.getTodoDoneList()).to.include("Flight tickets");
    expect(boardingPass.boardingPassImageUrl).to.include("boarding-pass-image");
    fs.accessSync(trip.boardingPassImage());
  }
  
  it('Testing handle new trip', function() {
    expect((new BoardingPassHandler(options)).handle()).to.be.ok;
    verifyExpectations();
  });

  // TODO: Figure out a way to verify that a new trip was not created and an existing trip was used. Right now, we rely on a log statement in boarding-pass-handler.js
  it('Testing existing trip', function() {
    const trip = sessions.find(fbid).addTrip(tripName);
    trip.addTripDetailsAndPersist({startDate: "5/1/17", destination: tripName});
    trip.addPortOfEntry(tripName);
    // The trip "new_york" should already exist.

    // call
    expect((new BoardingPassHandler(options)).handle()).to.be.ok;
    verifyExpectations();
  });

  it("Test presence of boarding pass image", function() {
    const session = (new Sessions()).find(fbid);
    if(!session) { throw new Error(`no session found for ${fbid}`); }
    else { logger.debug(`Session from test is ${session.sessionId}`); }
    logger.warn(`session list: ${fs.readdirSync("/home/ec2-user/sessions")}`);
    expect((new BoardingPassHandler(options)).handle()).to.be.ok;
    expect(fs.existsSync((new TripData(tripName)).boardingPassImage())).to.be.ok;
  });
  
  it("test handling itinerary, not boarding pass", function() {
  });
});

