'use strict';
const _=require('lodash');
const fs = require('fs');
const logger = require('./my-logger');
const Encoder = require('./encoder');

function Country(country) {
  try {
    const file = `countries/${Encoder.encode(country)}.txt`;
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
    logger.warn(`file for country ${country} does not exist: ${err.message}`);
  }
  return undefined;
}

module.exports = Country;

