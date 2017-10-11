'use strict';

const moment = require('moment-timezone');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const validator = require('node-validator');

function Validator(data) {
  this.data = data;
}

function validateStartDate(value, onError) {
  const now = moment().tz("Etc/UTC");
  
  const check = validator.isObject()
    .withRequired('startDate', validator.isDate());

  var errCount = 0;
  var error = {};
  validator.run(check, { startDate: value}, function(ec, e) {
      errCount = ec;
      error = e;
  });
  if(errCount > 0) {
    return onError(error[0].message, error.parameter, error.value);
  }
  const startDate = moment.tz(new Date(value), "Etc/UTC");
  // logger.debug(`Time now is ${now}; Passed value is ${new Date(value).toISOString()}. Difference is ${now.diff(startDate, 'days')}`);
  if(now.diff(startDate,'days') >= 0) {
    return onError("Provided start date is in the past", "", value);
  }
  return null;
}

Validator.prototype.validate = function() {
  const td = this.data.split(',');
  const response = {};
  if(td.length != 3) {
    logger.error(`validate: Expected 3 items in tripDetails, but only found ${td.length}: [${td}]. Message text: ${this.data}`);
    response.error = [];
    response.error.push({
      message: "invalid separator. Please enter a comma separated list of destination country, start date and duration (in days)"
    });
    return response;
  }
  if(td[1].match(/^ *\d+\/\d+$/)) { // if date is of the form "1/1", "10/10" or " 1/10", append year
    td[1] = td[1].concat(`/${new Date().getFullYear()}`);
  }
  response.tripDetails = {
    destination: td[0].trim(),
    startDate:  td[1].trim(),
    duration: parseInt(td[2].trim()) 
  };
  const customValidator = {
      validate: validateStartDate
  };
  // logger.debug(`Validating trip data: ${JSON.stringify(response.tripDetails)}`);
  // validate tripData
  const check = validator.isObject()
    .withRequired('duration', validator.isInteger({min: 1, max: 365}))
    .withRequired('startDate', customValidator)
    .withRequired('destination', validator.isString({regex: /^[A-Z a-z]+$/}));
  
  validator.run(check, response.tripDetails, function(ec, e) {
    if(ec > 0) response.error = e;
  });
  return response;
}

// see if the data was just a destination
Validator.prototype.validateJustDestination = function() {
  const response = {};
  response.tripDetails = {};
  response.tripDetails.destination = this.data;
  const check = validator.isObject()
    .withRequired('destination', validator.isString({regex: /^[A-Z a-z]+$/}));

  validator.run(check, response.tripDetails, function(ec, e) {
    if(ec > 0) response.error = e;
  });
  return response;
}

module.exports = Validator;
