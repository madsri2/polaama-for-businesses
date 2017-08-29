'use strict';

const Workflow = require('departure-city-workflow/app/workflow');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const expect = require('chai').expect;
const Promise = require('promise');

describe("DepartureCity workflow tests", function() {
  const myFbid = "1234";
  const tripName = "test-sfo";
  const sessions = Sessions.get();

  function setup() {
    const session = sessions.findOrCreate(myFbid);
    return new WebhookPostHandler(session, true /* testing */);
  }
  const handler = setup();

  beforeEach(function() {
    handler.session = sessions.findOrCreate(myFbid);
    handler.testing_createNewTrip({
      destination: tripName,
      startDate: "08/10/2017",
      duration: 8,
      portOfEntry: "tel aviv"
    });
  });

  afterEach(function() {
    sessions.testing_delete(myFbid);
    new TripData(tripName, myFbid).testing_delete();
  });

  it("setting valid departure city", function(done) {
    handler.sessionState.set("awaitingDepartureCityDetails");
    const workflow = new Workflow(handler, "san francisco", null);
    const promise = workflow.set();
    expect(typeof promise).to.equal("object");
    promise.done(function(response) {
      const trip = handler.session.tripData();
      // logger.debug(`trip dump: ${JSON.stringify(trip)}`);
      // expect that the workflow will asks the question of "Do you want to set san_francisco as your hometown" question
      expect(response).to.be.false;
      expect(trip.data.leavingFrom).to.equal("san_francisco");
      expect(trip.data.departureCityCode).to.equal("SFO");
      done();
    },
      function(err) {
        logger.error(`Error from promise: ${err.stack}`);
        done(err);
    });
  });

  it("setting departure city as hometown", function() {
    handler.session.tripData().persistDepartureCityAndCode("san francisco","SFO");
    handler.sessionState.set("awaitingUseAsHometown");
    const quick_reply = {
      payload:  "qr_use_as_hometown_yes"
    };
    const workflow = new Workflow(handler, null, quick_reply);
    const result = workflow.set();
    expect(typeof result).to.equal("boolean");
    expect(result).to.be.true;
    expect(handler.session.hometown).to.equal("san_francisco");
  });

  it("asking to use hometown as departure city", function() {
    handler.session.persistHometown('san francisco');
    const workflow = new Workflow(handler, null, null);
    const result = workflow.set();
    expect(typeof result).to.equal("boolean");
    expect(result).to.be.false;
    expect(handler.sessionState.get("awaitingUseHometownAsDepartureCity")).to.be.true;
  });

  it("just using hometown as departure city", function(done) {
    handler.session.persistHometown('san francisco');
    handler.sessionState.set("awaitingUseHometownAsDepartureCity");
    const quick_reply = {
      payload:  "qr_use_hometown_as_dep_city_yes"
    };
    const workflow = new Workflow(handler, null, quick_reply);
    const promise = workflow.set();
    expect(typeof promise).to.equal("object");
    promise.done(function(response) {
      expect(response).to.be.true;
      const trip = handler.session.tripData();
      // logger.debug(`trip dump after calling "set": ${JSON.stringify(trip)}; session dump: ${JSON.stringify(handler.session)}`);
      expect(trip.data.leavingFrom).to.equal("san_francisco");
      expect(trip.data.departureCityCode).to.equal("SFO");
      done();
    },
      function(err) {
        logger.error(`Error from promise: ${err.stack}`);
        done(err);
    });
  });

  it("not using hometown as departure city", function(done) {
    handler.session.persistHometown('san francisco');
    handler.sessionState.set("awaitingUseHometownAsDepartureCity");
    const quick_reply = {
      payload:  "qr_use_hometown_as_dep_city_no"
    };
    let workflow = new Workflow(handler, null, quick_reply);
    const result = workflow.set();
    expect(typeof result).to.equal("boolean");
    expect(result).to.be.false;
    expect(handler.sessionState.get("awaitingDepartureCityDetails")).to.be.true;
    workflow = new Workflow(handler, "san francisco", null);
    const promise= workflow.set();
    expect(typeof promise).to.equal("object");
    promise.done(function(response) {
      expect(response).to.be.true;
      const trip = handler.session.tripData();
      expect(trip.data.leavingFrom).to.equal("san_francisco");
      done();
    },
      function(err) {
        logger.error(`Error from promise: ${err.stack}`);
        done(err);
    });
  });
});
