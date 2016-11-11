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

FAADataHelper.prototype.formatAirportStatus = function(status) {
  var delayStr = "no delay at";
  if(status.delay === true) {
    delayStr = "a delay for";
  }
  const weather = _.template('The current weather conditions are ${weather}, ${temp} and wind ${wind}.')({
    weather: status.weather.weather,
    temp: status.weather.temp,
    wind: status.weather.wind
  });
  if(status.delay === true) {
    return _.template('There is currently a delay for ${airport}. The average delay time is ${delay}. Delay is because of the following: ${reason}. ${weather}')({
      airport: status.name,
      delay: status.status.avgDelay,
      reason: status.status.reason,
      weather: weather
    });
  }
  return _.template('There is currently no delay at ${airport}. ${weather}')({
    airport: status.name,
    weather: weather
  });
}

module.exports = FAADataHelper;


