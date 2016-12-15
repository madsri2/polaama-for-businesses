'use strict';
const TripData = require('./trip-data');
const fs = require('fs');
const moment = require('moment');
const _ = require('lodash');
const tripBaseDir = "trips";

const tripData = new TripData("Blah");

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

testingGetInfoFromTrip();

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


