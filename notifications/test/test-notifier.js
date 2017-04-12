'use strict';
const expect = require('chai').expect;

const baseDir = "/home/ec2-user";
const Sessions = require(`${baseDir}/sessions`);
const Notifier = require('notifications/app/notifier');

describe("Test Notifications", function() {
  it("test sending trip details just before trip", function() {
    // set up, modeled after webhook-post-handler:createNewTrip
    const tripDetails = {
      destination: "test-sending-TripDetails",
      startDate: "4/11/2017"
    };
    const sessions = new Sessions();
    const session = sessions.find("1111111111111111");
    session.addTrip(tripDetails.destination);
    session.tripData().addTripDetailsAndPersist(tripDetails);
    // test
    const notifier = new Notifier(sessions);
    let list = notifier.tripDetailsJustBeforeTrip();
    // verify
    expect(list.length).to.equal(1);
    expect(list[0].recipient.id).to.equal(session.fbid);
    list = notifier.tripDetailsJustBeforeTrip();
    expect(list.length).to.equal(0);
  });
});
