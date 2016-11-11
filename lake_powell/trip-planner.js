'use strict';

var _ = require('lodash');
var rp = require('request-promise');
const ENDPOINT = 'https://polaama.com/';

function TripPlanner() {}

TripPlanner.prototype.getPackList = function(tripName) {
  const packUrl = ENDPOINT + tripName + "/pack-list";
  var options = {
    method: 'GET',
    uri: packUrl,
    resolveWithFullResponse: true,
    json: true
  };

  console.log("getPackList called. will call polaama endpoint " + packUrl);
  return rp(options).then(function(response) {
    console.log("success - polaama responded");
    return response.body;
  });
}

TripPlanner.prototype.formatPackList = function(tripName, packList) {
  console.log("formatPackList called with trip " + tripName + " and pack list " + JSON.stringify(packList));
  var response = _.template('There are ${length} items to pack for your trip to ${tripName}. They are ${pl}.')({
    length: packList.length,
    tripName: tripName,
    pl: packList.join()
  });
  return response;
}

module.exports = TripPlanner;
