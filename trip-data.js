'use strict';
const fs = require('fs');
const _ = require('lodash');
const Log = require('./logger');
const logger = (new Log()).init();

function TripData() {}

TripData.prototype.persistTrip = function(tripName, context) {
  logger.info("calling persistTrip");
  const trip = {};
  trip['destination'] = context.destination;
  trip['duration'] = context.duration;
  trip['startDate'] = context.datetime;
  // TODO: Get this information from weather API or the file persisted.
  trip['weather'] = "sunny";
  trip['packList'] = createPackList(trip['weather']);
  trip['todoList'] = createTodoList(trip);
  trip['comments'] = [
    "Average water temperature will be around 60F, not suitable for swimming",
  ];

  persistUpdatedTrip(tripName, trip);
}

TripData.prototype.getInfoFromTrip = function(req, tripKey) {
  const tripName = req.params.tripName;
  const trip = retrieveTrip(tripName);
  console.log("Found trip in getInfoFromTrip: " + JSON.stringify(trip));
  if(_.isUndefined(trip) || _.isUndefined(trip[tripKey])) {
    logger.info("could not find " + tripKey + " for trip " + tripName);
    return undefined;
  }
  logger.info("returning " + trip[tripKey] + " with " + trip[tripKey].length + " items. ;Destination is " + trip.destination);
  return trip[tripKey];
}

//TODO: This needs to be a local function. It should not be used anywhere else.
TripData.prototype.encode = function(tripName) {
  return tripName.toLowerCase().replace(" ","_");
}

function retrieveTrip(tripName) {
  try {
    const file = tripFile(tripName);
    logger.info("trying to retrieve trip from file: ",file);
    fs.accessSync(file, fs.F_OK);
    try {
      const trip = JSON.parse(fs.readFileSync(file, 'utf8')); 
      console.log("returning trip " + JSON.stringify(trip));
      return trip;
    }
    catch(err) {
      logger.error("error reading from ",file, err.stack);
      return null;
    }
  }
  catch(err) {
      logger.info("file does not exist. returning empty map");
      var empty = {};
      return empty; 
  }
}


function createPackList(weather) {
  var packList = [];
  // if the weather is sunny, add corresponding items.
  switch(weather) {
    case "sunny": 
      packList.push("cap/hat");
      packList.push("sunglass");
      break;
  }

  return packList;
}

function createTodoList(trip) {
  var todoList = [];
  todoList.push("Flight tickets");
  todoList.push("Place to stay");
  todoList.push("Rental car");

  return todoList;
}

function tripFile(tripName) {
  // TODO: check parameters
  return _.template("trips/${name}.txt")({
    name: encode(tripName)
  });
}

function persistUpdatedTrip(tripName, trip) {
  const file = tripFile(tripName);
  try {
    fs.writeFileSync(file, JSON.stringify(trip));
    logger.info("saved trip for ",tripName);
    return true;
  }
  catch(err) {
    logger.error("error writing to ",file,err.stack);
    return false;
  }
}

module.exports = TripData;
