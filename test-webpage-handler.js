'use strict';
const WebpageHandler = require('./webpage-handler');
const Sessions = require('./sessions');
const ss = Sessions.get();

function Response() {
}

Response.prototype.send = function(html) {
  console.log(html);
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
  const s2 = ss.findOrCreate("2");
  s2.addTrip("b");
  const tripDetails = {
    destination: "b",
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

// testAddCitiesNewTrip();
testAddCitiesExistingTrip();

