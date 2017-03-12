'use strict';
const sinon = require('sinon');
const expect = require('chai').expect;
const TripData = require('../../trip-data');
const Session = require('../../session');
const Workflow = require('../app/workflow');

describe("Testing workflow", function() {
  const emptyTrip = Object.create(TripData.prototype);
  const trip = sinon.mock(emptyTrip);
  const emptySession = Object.create(Session.prototype);
  const session = sinon.mock(emptySession);
  it('testing doWork', function() {
    session.tripData = session.expects('tripData').atLeast(1).returns(trip);
    session.fbid = "12234";
    const workflow = new Workflow(session);
    trip.data = {};
    expect(workflow.startWork()).to.have.keys('recipient', 'message');

    expect(workflow.doWork({quick_reply: {payload: "3"}}).message.text).to.equal(workflow.firstFamilyNameMessage);

    trip.persistUpdatedTrip = trip.expects('persistUpdatedTrip').atLeast(1);
    expect(workflow.doWork({text: "A,A1"}).message.text).to.equal(workflow.familyNameMessage);
    expect(workflow.doWork({text: "B,B1"}).message.text).to.equal(workflow.familyNameMessage);
    expect(workflow.doWork({text: "C,C1,C2"}).message.text).to.equal(workflow.enterExpenseComment);
    const travList = {
      'A': ["A","A1"],
      'B': ["B","B1"],
      'C': ["C","C1","C2"]
    };
    expect(trip.data.travelers).to.deep.equals(travList);
    trip.storeExpenseEntry = trip.expects('storeExpenseEntry').once();
    workflow.doWork({text: "A paid $50"});
    expect(workflow.done).to.equal(true);
  });
});

