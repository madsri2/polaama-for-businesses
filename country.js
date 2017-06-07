'use strict';
const _=require('lodash');
const fs = require('fs');
const baseDir = "/home/ec2-user/";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

function Country(country) {
	cityCountryMap.call(this);
  if(!country) {
    logger.warn(`Passed parameter country is not defined`);
    return undefined;
  }
	
  try {
    const file = `${baseDir}countries/${Encoder.encode(country)}.txt`;
    fs.accessSync(file, fs.F_OK);
    try {
      this.data = JSON.parse(fs.readFileSync(file, 'utf8'));
      this.cities = this.data.cities;
      this.name = country;
    }
    catch(err) {
      logger.error("error reading from ", file, err.stack);
      return undefined;
    }
    return;
  }
  catch(err) {
    logger.warn(`file for country ${country} does not exist`);
  }
  return undefined;
}

// TODO: Get the cities from the file instead of hard-coding it here.
function cityCountryMap() {
	this.cityMap = {
		'tel_aviv': 'israel'
	};
}

Country.prototype.getCountry = function(city) {
	return this.cityMap[Encoder.encode(city)];
}

module.exports = Country;

