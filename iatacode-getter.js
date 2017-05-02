'use strict';
const fs = require('fs');
const _ = require('lodash');
const walkSync = require('walk-sync');
const IataCode = require('iatacodes');
const SecretManager = require('secret-manager/app/manager');
const ic = new IataCode(new SecretManager().getIatacodeApiKey());
const Promise = require('promise');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

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
	if(city) this.city = city;
}

IataCodeGetter.prototype.getCodeSync = function() {
  const city = this.city;
  let file = cityFileExists.call(this);
  if(file) {
    try {
      const body = JSON.parse(fs.readFileSync(file, 'utf8'));
      logger.info(`getCodeSync: Obtained body ${JSON.stringify(body)} from file ${file}`);
      if(body.iatacode) {    
        return body.iatacode;
      }
    }
    catch(e) {
      logger.error(`getIataCode: could not read data from file ${file}. Error : ${e.message}`);
    }
  }
  return undefined;
}

/*
TODO: This is not perfect. Skyscanner does not support city codes (eg. it supports CDG, but not PAR). So, we are using airport_by_cities and looking for "international" airports. If we don't find tit, resort to the first airport in airport_by_cities, which is typically the best airport.
*/
IataCodeGetter.prototype.getCode = function(callback) {
  // TODO: Move the functionality of getting details from file into constructor
  let iatacode = this.getCodeSync();
  let country;
  if(iatacode) return callback(iatacode);
  logger.info(`getCode: file does not exist. Getting code for city ${this.city} from iatacode.org`);
  const self = this;
  ic.api('autocomplete', {query: `${this.city}`}, function(err, response) {
    if(err) {
      logger.error(`getIataCode: Error getting ${self.city}'s code from iatacode.org: ${err}`);
      return callback(new Error(err));
    }
    const airports = response.airports_by_cities;
    if(!airports) {
      logger.warn(`getIataCode: Could not find code in response: ${JSON.stringify(response)}`);
      return callback(new Error("airport code not found in response"));
    }
    let body = {};
    body.iatacode = airports[0].code;
    body.country = airports[0].country_name;
    if(!airports[0].name.includes("International")) {
      for(let i = 1; i < airports.length; i++) {
        const a = airports[i];
        if(a.name.includes("International")) {
          body.iatacode = a.code;
          body.country = a.country_name;
          logger.debug(`Returning code ${body.iatacode} for airport ${a.name}. Country is ${body.country}`);
        }
      }
    }
    iatacode = body.iatacode;
    return persistCode(self.city, body, callback);
  });
}

/*
IataCodeGetter.prototype.getCity = function(code) {
  return new Promise(function(fulfil, reject) {
    ic.api('cities', {code: `${code}`}, function(err, response) {
      if(err) {
        logger.error(`getCity: error: ${err.stack}`);
        return reject(err);
      }
      logger.debug(`response from iatacode: ${response}`);
      return fulfil(response);
    });
  });
}
*/

function cityFileExists() {
  if(_.isUndefined(this.fileList)) {
    this.fileList = walkSync(`${baseDir}/countries`, {directories: true});
  }
  let absFileName;
  const fName = `${Encoder.encode(this.city)}`;
  this.fileList.forEach(file => {
    if(file.includes(`/${fName}/iatacode.txt`)) {
      absFileName = `${baseDir}/countries/${file}`;
      return;
    }
  });
  return absFileName;
}

function persistCode(city, body, callback) {
  if(_.isUndefined(body.iatacode)) {
    logger.error(`persistCode: iatacode for city ${city} is undefined. Doing nothing`);
    return;
  }
  const dir = `${baseDir}/countries/${Encoder.encode(body.country)}`;
  const cityDir = `${dir}/${Encoder.encode(city)}`;
  const file = `${cityDir}/iatacode.txt`;
  try {
    if(!fs.existsSync(dir)) {
      logger.info(`persistCode: Directory ${dir} not present. creating it`);
      fs.mkdirSync(dir);
    }
    if(!fs.existsSync(cityDir)) {
      logger.info(`persistCode: Directory ${cityDir} not present. creating it`);
      fs.mkdirSync(cityDir);
    }
    fs.writeFileSync(file, JSON.stringify(body), 'utf8');
  }
  catch(e) {
    logger.error(`persistCode: Error writing to file ${file}: ${e.message}`);
  }
  logger.info(`persisted city code to file ${file}`);
  callback(body.iatacode);
}

module.exports = IataCodeGetter;
