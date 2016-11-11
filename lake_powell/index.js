'use strict';

module.change_code = 1;

var _=require('lodash');
var Alexa = require('alexa-app');
var app = new Alexa.app('lake-powell');
var TripPlanner = require('./trip-planner');

app.launch(function(req, res) {
  var prompt = 'For pack list information, tell me the name of your destination';
  console.log("launch function called");
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

app.intent('GetPackListIntent', {
    'slots': {
      'TripName': 'TRIPS'
    },
    'utterances': ['{|get|fetch|retrieve} {|pack list|list|items to pack|items to take} {|for|for trip|when traveling to|when we go to|when I go to} {-|TripName}']
  },
  function(req, res) {
    var tripName = req.slot('TripName');
    var reprompt = "Tell me your destination to get the pack list information";

    console.log("GetPackListIntent intent called with tripname " + tripName);
    if(_.isEmpty(tripName)) {
      console.log("No tripName was passed");
      const prompt = "I did not hear a tripName. Tell me your destination.";
      res.say(prompt).reprompt.shouldEndSession(false).send();
      return true;
    }
    var tripPlanner = new TripPlanner();
    tripPlanner.getPackList(tripName).then(function(packList) {
      console.log("packlist for trip " + tripName + " is " + JSON.stringify(packList));
      return res.say(tripPlanner.formatPackList(tripName, packList)).send();
    }).catch(function(err) {
      console.log(err.statusCode);
      const prompt = "I don't have a pack list for " + tripName;
      res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
    });
    return false;
  }
);

module.exports = app;
