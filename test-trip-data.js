'use strict';
const TripData = require('./trip-data');
const Promise = require('promise');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');
const tripBaseDir = "trips";
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

const tripData = new TripData("Israel");

function testingGetInfoFromTrip() {
  console.log("testing getInfoFromTrip trip details: ",JSON.stringify(tripData.getInfoFromTrip("comments")));
}

function testingEncode() {
  console.log("encode testing: ",tripData.encode("Hello World"));
}

function testTemplate() {
  const tripName = "aa";
  const str = `https://polaama.com/${tripName}/todo`;
  console.log(str);
}

function testCommentUrlPath() {
  console.log(tripData.commentUrlPath());
}

function testTodoUrlPath() {
  console.log(tripData.todoUrlPath());
}

function testPackListPath() {
  console.log(tripData.packListPath());
}

function testConstructor() {
  const b = new TripData("b",true);
  console.log(b.rawTripName);
}

function testFileList() {
  let tripList = [];
  fs.readdirSync(tripBaseDir).forEach(name => {
    if(!name.startsWith(".")) {
      console.log(name);
      const tripData = JSON.parse(fs.readFileSync(`${tripBaseDir}/${name}`,'utf8'));
      // only add those trips whose start date is after today or we don't know the start date
      if(_.isUndefined(tripData.startDate) || moment(tripData.startDate).diff(moment(),'days') >= 0) { 
        tripList.push({
          name: tripData.name,
          rawName: tripData.rawName
        });
      }
    }
  });
  return tripList;
}

function testingElements() {
  const elements = [];
  elements.push({
    title: "Create new trip",
    buttons: [{
    type: "postback",
    title: "New Trip",
    payload: `trip_in_context ${TripData.encode("New Trip")}`
  }]
  });
  TripData.getTrips().forEach(k => {
    elements.push({
      title: k.rawName,
      buttons: [{
        type: "postback",
        title: k.name,
        payload: `trip_in_context ${k.name}`
      }]
    })
  });
  console.log(JSON.stringify(elements));
}


function testAddPortOfEntry() {
  // remove previous file entry
  const trip = new TripData("Testing");
  trip.addPortOfEntry("b");
  const updatedTrip = new TripData("Testing");
  console.log(JSON.stringify(updatedTrip));
}

function testGetExpenseReport() {
  const trip = new TripData("portugal");
  console.log(trip.getExpenseReport());
}

function testAddCityItinerary() {
  const trip = new TripData("TestAddingCityItinerary");
  trip.addCityItinerary(["A","B"],[1,2]);
  console.log(`Trip details: ${JSON.stringify(trip)}`);
}

function testUpdateItinerary() {
  const trip = new TripData("TestUpdatingItinerary");
  // promise.done does not seem to work here. I get a promise.done not a function error.
  trip.updateItinerary("11-1-2017", "hello world").then(
    function(r) {
      const content = require('fs').readFileSync(trip.userInputItinFile(),'utf8');
      if(content.includes("11/1/2017")) {
        console.log(`test passed`);
      }
      else {
        console.log(`test failed: ${content}`);
      }
    },
    function(err) {
      console.log(`test failed: Error: ${e.stack}`);
    }
  );
}

function testCategorizingComments(comments, expected) {
  const taggedComments = new TripData("test-categorizing-comments").testing_categorizeComments(comments);
  let actual = "";
  Object.keys(taggedComments).forEach(key => {
    const items = taggedComments[key];
    if(items.length > 0) actual = actual.concat(`${items.length} ${key}; `);
  });
  console.log(`EXPECTED: ${expected}. ACTUAL: ${actual}`);
}


testCategorizingComments(["beach activity","a beach worth visiting", "a beach.", "somethingwithbeachinmiddle", "gardentostart", "a garden.", ": garden."], "5 activities; 2 others");
testCategorizingComments(["hotel ","airbnb: ", "somethinghotelairbnb", "an ok condo."], "3 stay; 1 others");
testCategorizingComments(["consumeraffairs","flight plan", "air tickets."], "2 flights; 1 others");
testCategorizingComments(["http://www.travelweekly.com/Cruise/Carnival-Cruise-Line/Carnival-Conquest/Cruise-p51209461","july 13th is royal caribbean and july 14th is carnival"], "2 others");

// testUpdateItinerary();

// testAddCityItinerary();

// testGetExpenseReport();

// testAddPortOfEntry();

// testingGetInfoFromTrip();

// testConstructor();
/*
console.log("========");
testingEncode();
console.log("========");
testingGetInfoFromTrip();
console.log("========");
testTemplate();
console.log("========");
testCommentUrlPath();
console.log("========");
testTodoUrlPath();
console.log("========");
testPackListPath();
*/


