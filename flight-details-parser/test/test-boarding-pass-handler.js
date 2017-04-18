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


describe('Testing flight details boarding-pass', function() {

  function setup() {
    // create a test file and pass that to fbid-handler
    const fbid = "12345";
    (new FbidHandler()).testing_add(fbid,{"first_name": "TestFirstname", "last_name": "Lastname"});
    return (new Sessions()).findOrCreate(fbid);
  }

  function cleanup(fbid, tripName) {
    (new FbidHandler()).testing_delete(fbid);
    (new Sessions()).find(fbid).testing_delete();
    (new TripData(tripName)).testing_delete();
  }
  
  it('Testing handle new trip', function() {
    setup(); 

    const options = {
      name: "TestFirstName LastName",
      pnr: "XWERGX",
      flight_num: "UA500",
      dep_code: "SEA",
      dep_city: "Seattle",
      arr_code: "JFK",
      arr_city: "New York",
      dep_date: "2017-05-01",
      dep_time: "09:00"
    };
    // call & verify
    expect((new BoardingPassHandler(options)).handle()).to.be.ok;
    // delete all relevant files
    cleanup("12345","New York");
  });

  // TODO: Figure out a way to verify that a new trip was not created and an existing trip was used. Right now, we rely on a log statement in boarding-pass-handler.js
  it('Testing existing trip', function() {
    const trip = setup().addTrip("New York");
    trip.addTripDetailsAndPersist({startDate: "2017-05-01", destination: 'New York'});
    trip.addPortOfEntry("New York");
    // The trip "new_york" should already exist.

    const options = {
      name: "TestFirstName LastName",
      pnr: "XWERGX",
      flight_num: "UA500",
      dep_code: "SEA",
      dep_city: "Seattle",
      arr_code: "JFK",
      arr_city: "New York",
      dep_date: "2017-05-01",
      dep_time: "09:00"
    };
    // call
    expect((new BoardingPassHandler(options)).handle()).to.be.ok;
    // delete all relevant files
    cleanup("12345","New York");
  });
});

