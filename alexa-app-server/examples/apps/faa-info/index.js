'use strict';

module.change_code = 1;

var _=require('lodash');
var Alexa = require('alexa-app');
var app = new Alexa.app('airportinfo');
var FAADataHelper = require('./faa_data_helper');

app.launch(function(req, res) {
  var prompt = 'For delay information, tell me an Airport code.';
  res.say(prompt).reprompt(prompt).shouldEndSession(false);
});

app.intent('airportinfo', {
  'slots': {
    'AIRPORTCODE': 'FAACODES'
  },
  'utterances': ['{|flight|airport} {|delay|status} {|info} {|for} {-|AIRPORTCODE}']
  },
  function(req, res) {
    // get slot.
    var airportCode = req.slot('AIRPORTCODE');
    var reprompt = 'Tell me an airport code to get delay information.';

    if (_.isEmpty(airportCode)) {
      const prompt = 'I didn\'t hear an airport code. Tell me an airport code.';
      res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
      return true;
    }
    else {
      // get airport details.
      var faaHelper = new FAADataHelper();
      faaHelper.requestAirportStatus(airportCode).then(function(apStatus) {
        console.log(apStatus);
        // return formatted response
        return res.say(faaHelper.formatAirportStatus(apStatus)).send();
      }).catch(function(err) {
        console.log(err.statusCode);
        const prompt = 'I didn\'t have data for an airport code of ' + airportCode;
        res.say(prompt).reprompt(reprompt).shouldEndSession(false).send();
      });

      return false;
    }
  }
);


module.exports = app;

