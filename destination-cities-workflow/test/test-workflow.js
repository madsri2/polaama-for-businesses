'use strict';

const Workflow = require('destination-cities-workflow/app/workflow');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const expect = require('chai').expect;
const moment = require('moment');

describe("DestinationCitiesWorkflow tests", function() {
  const myFbid = "1234";
  const tripName = "test-dest-city-wf";
  const sessions = Sessions.get();

  function setup() {
    const session = sessions.findOrCreate(myFbid);
    return new WebhookPostHandler(session, true /* testing */);
  }

  beforeEach(function() {
    const tenDaysFromNow = new Date();
    tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
    const startDate = new moment(tenDaysFromNow).format("MM/DD/YYYY");
    handler.session = sessions.findOrCreate(myFbid);
    handler.testing_createNewTrip({
      destination: tripName,
      startDate: startDate,
      duration: 4
    });
  });

  afterEach(function() {
    sessions.testing_delete(myFbid);
    new TripData(tripName, myFbid).testing_delete();
  });
  
  const handler = setup();

  it("city as destination", function(done) {
    handler.session.tripData().data.destination = "sfo";
    const workflow = new Workflow(handler);
    const resultPromise = workflow.handleNewTrip();
    resultPromise.done(
      function(response) {
        expect(response).to.be.true;
        const trip = handler.session.tripData();
        expect(trip.data.portOfEntry).to.equal("san_francisco");
        expect(trip.data.portOfEntryCode).to.equal("SFO");
        expect(trip.data.cityItin).to.not.be.null;
        done();
      },
      function(err) {
        expect(false).to.be.true;
        done(err);
      }
    );
  });

  it("ask user to enter city", function(done) {
    handler.session.tripData().data.destination = "thailand";
    const workflow = new Workflow(handler);
    let resultPromise = workflow.handleNewTrip();
    resultPromise.then(
      function(response) {
        expect(response).to.be.false;
        const trip = handler.session.tripData();
        expect(trip.data.cityItin).to.be.undefined;
        expect(handler.sessionState.get("awaitingCitiesForNewTrip")).to.be.true;
        return workflow.handleNewTrip("bangkok(2), phuket(2)");
      },
      function(err) {
        return Promise.reject(err);
      }
    ).done(
      function(response) {
        expect(response).to.be.true;
        const trip = handler.session.tripData();
        expect(handler.sessionState.get("awaitingCitiesForNewTrip")).to.be.false;
        expect(trip.data.portOfEntry).to.equal("bangkok");
        expect(trip.data.portOfEntryCode).to.equal("BKK");
        expect(trip.data.cityItin).to.not.be.null;
        expect(trip.data.cityItin.cities).to.deep.equal(["bangkok","phuket"]);
        expect(trip.data.cityItin.numOfDays).to.deep.equal(["2","2"]);
        done();
      },
      function(err) {
        expect(false).to.be.true;
        done(err);
      }
    );
  });

  it("country where cities exist", function(done) {
    handler.session.tripData().data.destination = "India";
    const workflow = new Workflow(handler);
    const resultPromise = workflow.handleNewTrip();
    resultPromise.done(
      function(response) {
        expect(response).to.be.true;
        const trip = handler.session.tripData();
        expect(trip.data.cityItin).to.be.undefined;
        done();
      },
      function(err) {
        expect(false).to.be.true;
        done(err);
      }
    );
  });
});
