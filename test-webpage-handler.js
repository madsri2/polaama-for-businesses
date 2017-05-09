'use strict';
const baseDir = "/home/ec2-user";
const WebpageHandler = require(`${baseDir}/webpage-handler`);
const ss = require(`${baseDir}/sessions`).get();
const TripData = require(`${baseDir}/trip-data`);
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

function Response() {
}

Response.prototype.send = function(html) {
  this.html = html;
}

const headers = {
  'user-agent': 'Mozilla test'
};

function testDisplayTrip() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("a");
  const handler = new WebpageHandler("aaaa","a");
  const res = new Response();
  handler.displayTrip(res);
}
// testDisplayTrip();

function testDisplayComments() {
  const s2 = ss.findOrCreate("2");
  s2.addTrip("b");
  const tripData = s2.tripData();
  // Commenting this so we don't keep adding this comment over & over
  // tripData.storeFreeFormText("2", "testing comments");
  const handler = new WebpageHandler("aaaa","b");
  const res = new Response();
  // handler.handleWebpage(res, handler.displayComments);
  handler.handleWebpage(res, handler.displayRawComments, [headers]);
}
// testDisplayComments();

function testSendFriendsList() {
  const s2 = ss.findOrCreate("2");
  const handler = new WebpageHandler("aaaa","b");
  const res = new Response();
  handler.sendFriendsList(res);
}
// testSendFriendsList();

function addTripForSession() {
  const myFbid = "2";
  const tripName = "b";
  // first clean up previous test state
  ss.testing_delete(myFbid);
  new TripData(tripName, myFbid).testing_delete();
  const s2 = ss.findOrCreate(myFbid);
  s2.addTrip(tripName);
  const tripDetails = {
    destination: tripName,
    startDate: "11/1/17",
    duration: 10
  };
  s2.tripData().addTripDetailsAndPersist(tripDetails);
}

function testAddCitiesNewTrip() {
  addTripForSession();
  const id = "aaaa";
  const tripName = "b";
  const handler = new WebpageHandler(id, tripName);
  const res = new Response();
  handler.displayCities(res);
}

function testAddCitiesExistingTrip() {
  addTripForSession();
  const id = "aaaa";
  const tripName = "b";
  const handler = new WebpageHandler(id, tripName);
  const res = new Response();
  handler.displayCitiesForExistingTrip(res);
  const expectedStr = '<option value="Bb">Bb</option><option value="Bbb">Bbb</option><option value="Bbbb">Bbbb</option>';
  logger.debug(`EXPECTATION: >0; ACTUAL: ${res.html.indexOf(expectedStr)}`);
}

function testHandleAddCityChoice() {
  addTripForSession();
  const id = "aaaa";
  const tripName = "b";
  const handler = new WebpageHandler(id, tripName);
  const res = new Response();
  const myPostHandler = new WebhookPostHandler(handler.session);
  return handler.handleAddCityChoice(req, res, myPostHandler, true /* existingTrip */);
}

function testAddingNewTraveler() {
  // we need sessions for friends and ourselves
  ss.findOrCreate("2");
  ss.findOrCreate("1234");
  const handler = new WebpageHandler("aaaa", "b");
  const str = handler.testing_addTravelers(null, {"Testing Testing":"Testing Testing", "Hu Tha": "Hu Tha"});
  
  logger.debug(`EXPECTATION: 0; ACTUAL: ${str.indexOf("saved trips to friends' list")}`);
}

// testAddCitiesNewTrip();
testAddCitiesExistingTrip();
testAddingNewTraveler();

