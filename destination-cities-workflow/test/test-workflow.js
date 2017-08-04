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

  it("city as destination", function() {
    handler.session.tripData().destination = "san francisco";
    const workflow = new Workflow(handler);
    const result = workflow.handleNewTrip();
    expect(result).to.be.true;
    const trip = handler.session.tripData();
    // logger.debug(`trip: ${JSON.stringify(trip)}`);
    expect(trip.data.cityItin).to.not.be.null;
  });

  it("ask user to enter city", function() {
    handler.session.tripData().destination = "Thailand";
    const workflow = new Workflow(handler);
    let result = workflow.handleNewTrip();
    expect(result).to.be.false;
    const trip = handler.session.tripData();
    expect(trip.data.cityItin).to.be.undefined;
    expect(handler.sessionState.get("awaitingCitiesForNewTrip")).to.be.true;
    result = workflow.handleNewTrip("bangkok(2), phuket(2)");
    expect(handler.sessionState.get("awaitingCitiesForNewTrip")).to.be.false;
    expect(trip.data.cityItin).to.not.be.null;
    expect(trip.data.cityItin.cities).to.deep.equal(["bangkok","phuket"]);
    expect(trip.data.cityItin.numOfDays).to.deep.equal(["2","2"]);
  });

  it("country where cities exist", function() {
    handler.session.tripData().destination = "India";
    const workflow = new Workflow(handler);
    const result = workflow.handleNewTrip();
    expect(result).to.be.true;
    const trip = handler.session.tripData();
    expect(trip.data.cityItin).to.be.undefined;
  });
});
