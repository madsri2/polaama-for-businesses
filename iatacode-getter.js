'use strict';
const IataCode = require('iatacodes');
const logger = require('./my-logger');
const fs = require('fs');
const _ = require('lodash');
const walkSync = require('walk-sync');
const ic = new IataCode('4a8368c8-4369-4ed3-90ab-f5c46ce34e54');
const Encoder = require('./encoder');

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

function IataCodeGetter(city) {
  this.city = city;
}

IataCodeGetter.prototype.getCode = function(callback) {
  // TODO: Move the functionality of getting details from file into constructor.
  let body = {};
  const city = this.city;
  let file = cityFileExists.call(this);
  if(!_.isUndefined(file)) {
    try {
      body = JSON.parse(fs.readFileSync(file, 'utf8'));
      if(!_.isUndefined(body.iatacode)) {    
        return callback(body.iatacode);
      }
    }
    catch(e) {
      logger.error(`getIataCode: could not read data from file ${file}. Getting code from iatacode.org: ${e.message}`);
    }
  }
  logger.info(`calling iata for city ${city}. file does not exist`);
  ic.api('autocomplete', {query: `${city}`}, function(err, response) {
    if(!_.isUndefined(err)) {
      logger.error(`getIataCode: Error getting ${city}'s code from iatacode.org: ${err} `);
      return;
    }
    response.cities.forEach(c => {
      if(c.name.toLowerCase() === city) {
        body.iatacode = c.code;
      }
    });
    if(_.isUndefined(body.iatacode)) {
      logger.warn(`getIataCode: Could not find code in response.cities: ${JSON.stringify(response.cities, null, 2)}`);
      return;
    }
    persistCode(city, body, callback);
  });
  return body.iatacode;
}

function cityFileExists() {
  if(_.isUndefined(this.fileList)) {
    this.fileList = walkSync("countries", {directories: false});
  }
  let absFileName;
  const fName = `${Encoder.encode(this.city)}.txt`;
  this.fileList.forEach(file => {
    if(file.indexOf(Encoder.encode(fName)) > -1) {
      absFileName = `countries/${file}`;
      return;
    }
  });
  return absFileName;
}

function getCountryAndPersist(countryCode, city, body, callback) {
  if(_.isUndefined(countryCode)) {
    logger.warn(`getCountryAndPersist: country_code is undefined for city ${body.iatacode}. Not persisting code.`);
    return;
  }
  ic.api('countries', {code: countryCode}, function(err, response) {
    if(!_.isUndefined(err)) {
      logger.error(`getCountryAndPersist: Error getting country name for ${countryCode} from iatacode.org: ${err}. Not persisting.`);
      return;
    }
    // console.log(`Response from calling countries: ${JSON.stringify(response)}`);
    response.forEach(country => {
      if(country.code === countryCode) {
        const dir = `countries/${Encoder.encode(country.name)}`;
        const file = `${dir}/${Encoder.encode(city)}.txt`;
        try {
          if(!fs.existsSync(dir)) {
            logger.info(`getCountryAndPersist: Directory ${dir} not present. creating it`);
            fs.mkdirSync(dir);
          }
          fs.writeFileSync(file, JSON.stringify(body), 'utf8');
        }
        catch(e) {
          logger.error(`getCountryAndPersist: Error writing to file ${file}: ${e.message}`);
        }
        logger.info(`persisted city code to file ${file}`);
        callback(body.iatacode);
      }
    });
  });
}

function persistCode(city, body, callback) {
  if(_.isUndefined(body.iatacode)) {
    logger.error(`persistCode: iatacode for city ${city} is undefined. Doing nothing`);
    return;
  }
  let countryCode = undefined;
  ic.api('cities', {code: body.iatacode}, function(err, response) {
    if(!_.isUndefined(err)) {
      logger.error(`persistCode: Error getting country code for ${city} from iatacode.org: ${err}. Not persisting`);
      return;
    }
    // console.log(`Response from calling cities: ${JSON.stringify(response, null, 2)}`);
    response.forEach(c => {
      countryCode = c.country_code;
    });
    getCountryAndPersist(countryCode, city, body, callback);
  });
}

module.exports = IataCodeGetter;
