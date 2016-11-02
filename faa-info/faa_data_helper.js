'use strict';

var _ = require('lodash');
var rp = require('request-promise');
const ENDPOINT = 'http://services.faa.gov/airport/status/';

function FAADataHelper() {}

FAADataHelper.prototype.requestAirportStatus = function(airportCode) {
  return this.getAirportStatus(airportCode).then(
    function(response) {
      console.log('success - received airport code info for ' + airportCode);
      return response.body;
    }
  );
};

FAADataHelper.prototype.getAirportStatus = function(airportCode) {
  var options = {
    method: 'GET',
    uri: ENDPOINT + airportCode,
    resolveWithFullResponse: true,
    json: true
  };

  return rp(options);
};

module.exports = FAADataHelper;


