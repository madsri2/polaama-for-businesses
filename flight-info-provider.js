'use strict';
const IataCode = require('iatacodes');
const logger = require('./my-logger');
const fs = require('fs');
const _ = require('lodash');
const walkSync = require('walk-sync');
const ic = new IataCode('4a8368c8-4369-4ed3-90ab-f5c46ce34e54');

/* 
ic.api('autocomplete', {query: 'lisbon'}, function(e, r) {
  console.log(r);
});

// response
{ countries: [],
  cities_by_countries: [],
  airports_by_countries: [],
  cities: [ { code: 'LIS', name: 'Lisbon', country_name: 'Portugal' } ],
  airports: 
   [ { code: 'LIS', name: 'Lisbon Portela', country_name: 'Portugal' },
     { code: 'ZYD', name: 'Lisbon TP', country_name: 'Portugal' } ],
  cities_by_airports: [],
  airports_by_cities: 
   [ { code: 'LIS', name: 'Lisbon Portela', country_name: 'Portugal' },
     { code: 'ZYD', name: 'Lisbon TP', country_name: 'Portugal' } ] 
}
*/

function FlightInfoProvider(origCity, destCity, startDate, returnDate) {
  this.origCity = origCity;
  this.destCity = destCity;
  this.startDate = startDate;
  this.returnDate = returnDate;
}

FlightInfoProvider.prototype.getFlightDetails = function(callback) {
  const origCode = getIataCode.call(this, this.origCity, callback);
  // const destCode = getIataCode.call(this, this.destCity);
  // console.log(`Code for ${this.origCity} is ${origCode}; code for ${this.destCity} is ${destCode}`);
}

function fileExists(fName) {
  if(_.isUndefined(this.fileList)) {
    this.fileList = walkSync("countries", {directories: false});
  }
  let absFileName;
  this.fileList.forEach(file => {
    if(file.indexOf(fName) > -1) {
      absFileName = `countries/${file}`;
      return;
    }
  });
  return absFileName;
}

function persistCode(city, body) {
  if(_.isUndefined(body.iatacode)) {
    logger.error(`persistCode: iatacode for city ${city} is undefined. Doing nothing`);
    return;
  }
  let countryCode = undefined;
  ic.api('cities', {code: body.iatacode}, function(err, response) {
    if(_.isNull(err)) {
      logger.error(`persistCode: Error getting country code for ${city} from iatacode.org: ${err}`);
      return undefined;
    }
    console.log(`Response from calling cities: ${JSON.stringify(response)}`);
    countryCode = response.country_code;
  });
  if(_.isUndefined(countryCode)) {
    return undefined;
  }
  ic.api('countries', {code: countryCode}, function(err, response) {
    if(_.isNull(err)) {
      logger.error(`persistCode: Error getting country name for ${countryCode} from iatacode.org: ${err}`);
      return;
    }
    console.log(`Response from calling countries: ${JSON.stringify(response)}`);
    const file = `countries/${response.name}/${city}.txt`;
    try {
      fs.writeFileSync(file, body, 'utf8');
      callback(body.iatacode);
    }
    catch(e) {
      logger.error(`persistCode: Error writing to file ${file}: ${e.message}`);
    }
  });
  return;
}

function getIataCode(city, callback) {
  let body = {};
  let file = fileExists.call(this, `${this.city}.txt`);
  if(!_.isUndefined(file)) {
    try {
      const body = JSON.parse(fs.readFileSync(file, 'utf8'));
      if(!_.isUndefined(body.iatacode)) {    
        return body.iatacode;
      }
    }
    catch(e) {
      logger.error(`getIataCode: could not read data from file ${file}. Getting code from iatacode.org: ${e.message}`);
    }
  }
  logger.info(`calling iata for city ${city}. file does not exist`);
  ic.api('autocomplete', {query: `${city}`}, function(err, response) {
    if(_.isNull(err)) {
      logger.error(`getIataCode: Error getting ${city}'s code from iatacode.org: ${err} `);
      return undefined;
    }
    console.log(`getIataCode: Response is ${JSON.stringify(response)}`);
    body.iatacode = response.cities.code;
    console.log(`code for ${city} is ${body.iatacode}`);
    persistCode(city, body, callback);
  });
  return body.iatacode;
}

module.exports = FlightInfoProvider;
