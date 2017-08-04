'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const ButtonsPlacement = require('get-buttons-placer/app/buttons-placement');
const FbidHandler = require('fbid-handler/app/handler');
const baseDir = "/home/ec2-user";
const TripData = require(`${baseDir}/trip-data`);
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe('testing buttons placement', function() {
  let fbid = "12345";
  const tripName = "trip";
  let encodedFbid;
  //set up
  beforeEach(function() {
    // create a test file and pass that to fbid-handler
    logger.debug("Setting up before test");
    const fbidHandler = FbidHandler.get('fbid-test.txt');
    fbidHandler.testing_add(fbid,{first_name: "TestFirstname", last_name: "Lastname"});
    encodedFbid = fbidHandler.encode(fbid);
  });

  // clean up
  afterEach(function() {
    logger.debug("Cleaning up after test");
    (new TripData(tripName, fbid)).testing_delete();
  });

  function createFlightItineraryFile() {
    const tripBaseDir = `${baseDir}/trips/${encodedFbid}`;
    fs.copySync(`${tripBaseDir}/forTestingPurposes/emptyFile.json`, TripData.testing_itineraryFile(encodedFbid, tripName));
  }

  function createBoardingPassFile() {
    const tripBaseDir = `${baseDir}/trips/${encodedFbid}`;
    fs.copySync(`${tripBaseDir}/forTestingPurposes/emptyFile.json`, TripData.testing_boardingPassFile(encodedFbid, tripName));
  }

  function createRunningTrailFile() {
    const tripBaseDir = `${baseDir}/trips/${encodedFbid}`;
    fs.copySync(`${tripBaseDir}/forTestingPurposes/emptyFile.json`, TripData.testing_runningTrailFile(encodedFbid, tripName));
  }

  it('no boarding pass and itinerary', function() {
    const result = new ButtonsPlacement("https://polaama.com/WBkW", new TripData(tripName, fbid, "fbid-test.txt")).getPlacement();
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    expect(Object.keys(result).length).to.equal(3);
    expect(result.firstSet).to.be.ok;
    expect(result.firstSet.length).to.equal(3);
    expect(result.firstSet[0].title).to.equal("Trip calendar");
    expect(result.firstSet[1].title).to.equal("Weather");
    expect(result.firstSet[2].title).to.equal("Comments");
    // expect(result.firstSet[2].title).to.equal("Activities");
    expect(result.secondSet.length).to.equal(3);
    expect(result.secondSet[0].title).to.equal("Todo list");
    expect(result.secondSet[1].title).to.equal("Pack list");
    expect(result.secondSet[2].title).to.equal("Expense report");
    expect(result.thirdSet.length).to.equal(1);
    expect(result.thirdSet[0].title).to.equal("Flight");
  });

  it('itinerary and no boarding pass', function() {
    createFlightItineraryFile();
    const trip = new TripData(tripName, "12345", "fbid-test.txt");
    const result = new ButtonsPlacement("https://polaama.com/WBkW", new TripData(tripName, fbid, "fbid-test.txt")).getPlacement();
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    expect(Object.keys(result).length).to.equal(3);
    expect(result.firstSet).to.be.ok;
    expect(result.firstSet.length).to.equal(3);
    expect(result.firstSet[0].title).to.equal("Flight Itinerary");
    expect(result.firstSet[1].title).to.equal("Trip calendar");
    expect(result.firstSet[2].title).to.equal("Weather");
    expect(result.secondSet.length).to.equal(3);
    // expect(result.secondSet[0].title).to.equal("Activities");
    expect(result.secondSet[0].title).to.equal("Comments");
    expect(result.secondSet[1].title).to.equal("Todo list");
    expect(result.secondSet[2].title).to.equal("Pack list");
    expect(result.thirdSet.length).to.equal(1);
    expect(result.thirdSet[0].title).to.equal("Expense report");
    // expect(result.thirdSet[1].title).to.equal("Flight");
  });

  it('both itinerary and boarding pass present', function() {
    createFlightItineraryFile();
    createBoardingPassFile();
    const trip = new TripData(tripName, "12345", "fbid-test.txt");
    const result = new ButtonsPlacement("https://polaama.com/WBkW", new TripData(tripName, fbid, "fbid-test.txt")).getPlacement();
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    expect(Object.keys(result).length).to.equal(3);
    expect(result.firstSet).to.be.ok;
    expect(result.firstSet.length).to.equal(3);
    expect(result.firstSet[0].title).to.equal("Boarding pass");
    expect(result.firstSet[1].title).to.equal("Flight Itinerary");
    expect(result.firstSet[2].title).to.equal("Trip calendar");
    expect(result.secondSet.length).to.equal(3);
    expect(result.secondSet[0].title).to.equal("Weather");
    // expect(result.secondSet[1].title).to.equal("Activities");
    expect(result.secondSet[1].title).to.equal("Comments");
    expect(result.secondSet[2].title).to.equal("Todo list");
    expect(result.thirdSet.length).to.equal(2);
    expect(result.thirdSet[0].title).to.equal("Pack list");
    expect(result.thirdSet[1].title).to.equal("Expense report");
  });

  it("itinerary and running trails present", function() {
    createFlightItineraryFile();
    createRunningTrailFile();
    const trip = new TripData(tripName, "12345", "fbid-test.txt");
    const result = new ButtonsPlacement("https://polaama.com/WBkW", new TripData(tripName, fbid, "fbid-test.txt")).getPlacement();
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    expect(Object.keys(result).length).to.equal(3);
    expect(result.firstSet).to.be.ok;
    expect(result.firstSet.length).to.equal(3);
    expect(result.firstSet[0].title).to.equal("Flight Itinerary");
    expect(result.firstSet[1].title).to.equal("Trip calendar");
    expect(result.firstSet[2].title).to.equal("Running Trails");
    expect(result.secondSet.length).to.equal(3);
    expect(result.secondSet[0].title).to.equal("Weather");
    // expect(result.secondSet[1].title).to.equal("Activities");
    expect(result.secondSet[1].title).to.equal("Comments");
    expect(result.secondSet[2].title).to.equal("Todo list");
    expect(result.thirdSet.length).to.equal(2);
    expect(result.thirdSet[0].title).to.equal("Pack list");
    expect(result.thirdSet[1].title).to.equal("Expense report");
  });

  it("todo list button", function() {
    const trip = new TripData(tripName, "12345", "fbid-test.txt");
    const result = new ButtonsPlacement("https://polaama.com/WBkW", new TripData(tripName, fbid, "fbid-test.txt")).getPlacement();
    logger.debug(`${JSON.stringify(result, null, 2)}`);
  });

  it("weather list button", function() {
    const trip = new TripData("san_francisco", fbid, "fbid-test.txt");
    trip.addTripDetailsAndPersist({
      startDate: "9/10/2017",
      portOfEntry: "san_francisco"
    });
    const result = new ButtonsPlacement("https://polaama.com/WBkW", trip).getPlacement();
    expect(result.secondSet[0].title).to.have.string("Weather");
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    trip.testing_delete();
  });

  it("flight quotes button", function() {
    const trip = new TripData("san_francisco", fbid, "fbid-test.txt");
    trip.addTripDetailsAndPersist({
      startDate: "9/11/2017",
      duration: "4",
      portOfEntry: "san_francisco",
      leavingFrom: "newark"
    });
    const file = `${baseDir}/flights/newark-san_francisco-2017-09-11-quote.txt`;
    fs.writeFileSync(file, "exists");
    const result = new ButtonsPlacement("https://polaama.com/WBkW", trip).getPlacement();
    expect(result.secondSet[0].title).to.have.string("Flight");
    // logger.debug(`${JSON.stringify(result, null, 2)}`);
    trip.testing_delete();
    fs.unlinkSync(file);
  });
});
