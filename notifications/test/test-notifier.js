'use strict';
const expect = require('chai').expect;
const moment = require('moment');

const Notifier = require('notifications/app/notifier');

const baseDir = "/home/ec2-user";
const Sessions = require(`${baseDir}/sessions`);
const TripData = require(`${baseDir}/trip-data`);
const fs = require('fs');

describe("Test Notifications", function() {
  const tripName = "test-sending-TripDetails";
  const tmpTrip = new TripData(tripName);
  const boardingPassFile = tmpTrip.boardingPassFile();
  const tripStartDate = moment().add(2, 'days').format("M/D/YYYY");
  
  before(function() {
    // create the boarding pass file
    const content = {
      full_name: "First Last",
      pnr_number: "VPWMFR",
      flight_number: "Alaska 393",
      departure_airport: {
        airport_code: "SJC",
        city: "San Jose"
      },
      arrival_airport: {
        airport_code: "SEA",
        city: "Seattle"
      },
      flight_schedule: {
        departure_time: `${tripStartDate}T01:15`
      }
    };
    if(!fs.existsSync(boardingPassFile)) fs.writeFileSync(boardingPassFile, JSON.stringify(content));
  });

  after(function() {
    fs.renameSync(boardingPassFile, tmpTrip.archiveBoardingPassFile()); 
  });

  it("test sending trip details just before trip", function() {
    const tripDetails = {
      destination: tripName,
      startDate: tripStartDate
    };
    const sessions = Sessions.get();
    const session = sessions.find("1111111111111111");
    // set up, modeled after webhook-post-handler:createNewTrip
    session.addTrip(tripDetails.destination);
    session.tripData().addTripDetailsAndPersist(tripDetails);
    // test
    const notifier = new Notifier(sessions);
    let list = notifier.imminentTripsList();
    // verify
    expect(list.length).to.equal(1);
    expect(list[0].recipient.id).to.equal(session.fbid);
    // test that we don't send information for the same trip multiple times
    list = notifier.imminentTripsList();
    expect(list.length).to.equal(0);
  });

  it("test get boarding pass", function() {
    const sessions = Sessions.get();
    const session = sessions.find("1111111111111111");
    const notifier = new Notifier (sessions);
    const boardingPass = notifier.getBoardingPass(session.tripData(), session.fbid);
    expect(boardingPass).to.not.be.null;
    expect(boardingPass.recipient.id).to.equal("1111111111111111");
    expect(boardingPass.message.attachment.type).to.equal("template");
    expect(boardingPass.message.attachment.payload.template_type).to.equal("airline_boardingpass");
    const myBoardingPasses = boardingPass.message.attachment.payload.boarding_pass;
    expect(myBoardingPasses.length).to.equal(1);
    expect(myBoardingPasses[0].passenger_name).to.equal("First Last");
    // console.log(`${JSON.stringify(boardingPass, null, 2)}`);
  });
});
