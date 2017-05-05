'use strict';

const Sessions = require('./sessions');
const ss = Sessions.get();

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
// testAddTrip();

function testPersistAndRetrieve() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("a");

  const s3 = Sessions.retrieveSession("2");
  // console.log(s2);
  // console.log(s3);
  delete s2.guid;
  delete s3.guid;
  if(JSON.stringify(s2) === JSON.stringify(s3)) {
    console.log("match");
  }
  else {
    console.log(`no match`);
    console.log(`s2: ${JSON.stringify(s2)}`);
    console.log(`s3: ${JSON.stringify(s3)}`);
  }
}  

function addNewTrip(id, name, destination, startDate, duration) {
  const s = ss.findOrCreate(id);
  s.addTrip(name);
  const details = {
    destination: destination,
    startDate: startDate,
    duration: duration
  };
  s.tripData().addTripDetailsAndPersist(details);
  return s;
}

// TODO: This test needs to be changed to dynamic dates for it to succeed.
function testGetFutureTrips() {
  // three future trips and two past trips
  addNewTrip("10", "ft1", "ft1", "1/1/17", "15");
  addNewTrip("10", "ft2", "ft2", "1/10/17", "25");
  addNewTrip("10", "ft3", "ft3", "5/1/17", "10");
  addNewTrip("10", "ft4", "ft4", "3/1/17", "12");
  const s = addNewTrip("10", "ft5", "ft5", "4/1/17", "15");
  console.log(`testGetFutureTrips trip names: ${JSON.stringify(s.getCurrentAndFutureTrips())}`);
}

function testGetPastTrips() {
  // three future trips and two past trips
  addNewTrip("10", "ft1", "ft1", "1/1/17", "15");
  addNewTrip("10", "ft2", "ft2", "1/10/17", "25");
  addNewTrip("10", "ft3", "ft3", "5/1/17", "10");
  addNewTrip("10", "ft4", "ft4", "3/10/17", "12");
  const s = addNewTrip("10", "ft5", "ft5", "4/1/17", "15");
  console.log(`testGetPastTrips trip names: ${JSON.stringify(s.getPastTrips())}`);
}

function testSessions() {
  console.log(ss.findOrCreate("2"));
}

testPersistAndRetrieve();
// testSessions();
// testGetFutureTrips();
// testGetPastTrips();
