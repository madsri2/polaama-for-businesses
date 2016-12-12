'use strict';

const Sessions = require('./sessions');
const ss = new Sessions();

function testFindOrCreateAndContextUpdates() {
  const s1 = ss.findOrCreate("1");
  // console.log(JSON.stringify(s1, null, 2));
  console.log("========= Testing findTrip ========");
  const trip = s1.findTrip("a");
  // console.log(JSON.stringify(trip, null, 2));
  console.log("========= Testing updateAiContext ========");
  let aiC = s1.aiContext("a");
  aiC.key = "value";
  s1.updateAiContext("a",aiC);
  console.log(JSON.stringify(s1.findTrip("a")));
  console.log("========= Testing deleteAiContext ========");
  s1.deleteAiContext("a");
  console.log(JSON.stringify(s1.findTrip("a")));
  console.log("========= Testing fbid ========");
  console.log(s1.getFbid());
}

function testAddTrip() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("a");
  console.log(`Value: ${JSON.stringify(s2.tripData())}`);
}

testAddTrip();
