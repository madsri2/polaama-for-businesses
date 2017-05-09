'use strict';
const _=require('lodash');
const fs = require('fs');
const baseDir = "/home/ec2-user/";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

function Country(country) {
  if(!country) {
    logger.warn(`Passed parameter country is not defined`);
    return undefined;
  }
  try {
    const file = `${baseDir}countries/${Encoder.encode(country)}.txt`;
    logger.debug(`Country: Looking at file ${file}`);
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

module.exports = Country;

