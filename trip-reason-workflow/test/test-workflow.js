'use strict';
const Workflow = require('departure-city-workflow/app/workflow');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);
const Sessions = require(`${baseDir}/sessions`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);
const expect = require('chai').expect;
const TripReasonWorkflow = require('trip-reason-workflow/app/workflow');

describe("TripReasonWorkflow workflow tests", function() {
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

  it("display trip reasons", function() {
    const workflow = new TripReasonWorkflow(handler);
    expect(workflow.handle()).to.be.false;
    expect(handler.sessionState.get("awaitingTripReason")).to.be.true;
  });

  it("ask conference name", function() {
    const workflow = new TripReasonWorkflow(handler);
    expect(workflow.handle("pb_event")).to.be.false;
    expect(handler.sessionState.get("awaitingConferenceName")).to.be.true;
  });

  it("handle sending conference name", function(done) {
    handler.testing_createNewTrip({
      destination: tripName,
      startDate: "09/10/2017",
      duration: 4,
      portOfEntry: "sfo",
      leavingFrom: "ewr"
    });
    handler.startPlanningTrip(true /* return promise */);
    handler.sessionState.set("awaitingTripReason");
    handler.sessionState.set("awaitingConferenceName");
    const workflow = new TripReasonWorkflow(handler);
    expect(workflow.handle("phocuswright")).to.be.true;
    expect(handler.sessionState.get("awaitingConferenceName")).to.be.false;
    expect(handler.sessionState.get("awaitingTripReason")).to.be.false;
    handler.tripPlanningPromise.done(
      function(result) {
        logger.debug(`result from promise is ${result}`);
        done();
      },
      function(err) {
        expect(false).to.be.true;
        done(err);
      }
    );
  });
});
