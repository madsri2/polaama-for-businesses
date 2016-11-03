'use strict';

var _ = require('lodash');
var rp = require('request-promise');
const ENDPOINT = 'https://polaama.com/';

function TripPlanner() {}

TripPlanner.prototype.getPackList = function(tripName) {
  var packUrl = ENDPOINT + tripName + "/pack-list";
  var options = {
    method: 'GET',
    uri: packUrl,
    resolveWithFullResponse: true,
    json: true
  };

  return rp(options).then(function(response) {
    console.log("success - polaama responded");
    return response.body;
  });
}

module.exports = TripPlanner;
