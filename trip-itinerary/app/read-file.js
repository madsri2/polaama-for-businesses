'use strict';
const Promise = require('promise');
const WeatherInfoProvider = require('../../weather-info-provider');

function ReadFile(name) {
  this.name = name;
}

ReadFile.prototype.read = function() {
  const promise = Promise.denodeify(require('fs').readFile.bind(this));
  console.log(`read: called me. about to read ${this.name}`);
  return promise(this.name, 'utf8');
}

ReadFile.prototype.getWeather = function() {
  return new Promise(function(fulfil, reject) {
    const wip = new WeatherInfoProvider('usa', "phoenix", "2017-11-01");
    wip.getWeather(function(c, weatherDetails) {
      if(weatherDetails) {
        console.log(`readFile.getWeather: ${JSON.stringify(weatherDetails)}`);
        fulfil(weatherDetails);
      }
      else {
        console.log(`Error: Could not get details`);
        reject(new Error(`Could not get details`));
      }
    });
  });
}

function setWeatherDetails(itinDate, country, city) {
  wip.getWeather();
}

module.exports = ReadFile;
