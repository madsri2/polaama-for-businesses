'use strict';
const IataCodeGetter = require('./iatacode-getter.js');
const request = require('request');
const fs = require('fs');
const _ = require('lodash');
const moment = require('moment');
const logger = require('./my-logger');
const sleep = require('sleep');
const FlightDataExtractor = require('./skyscanner-flight-data.js');

const apiKey = "prtl6749387986743898559646983194";
// const apiKey = "ma592384304502739139844422016106";

function FlightInfoProvider(origCity, destCity, startDate, returnDate) {
  this.origCity = origCity;
  this.destCity = destCity;
  this.startDate = startDate;
  this.returnDate = returnDate;
}

// http://partners.api.skyscanner.net/apiservices/pricing/uk1/v1.0/47f84618953245ab86105b0062c5d9ea_ecilpojl_F86CEB22248C4E68C7C54A17455C84BE
FlightInfoProvider.prototype.getFlightDetails = function(callback) {
  const self = this;
  (new IataCodeGetter(this.origCity)).getCode(function(code) { self.origCode = code;});
  (new IataCodeGetter(this.destCity)).getCode(function(code) {
    self.destCode = code;
    if(!self.origCode || !self.destCode) {
      // no point in proceeding if either dest or orig code is missing.
      logger.warn(`getFlightDetails: either origCode or destCode is undefined [origCode: ${self.origCode}; destCode: ${self.destCode}]. Not proceeding with getting flight details!`);
      throw new Error(`Either origCode or destCode is undefined`);
    }
    // TODO: Check if the flights file was created only maxAgeInMinutes ago and if so, short circuit.
    const file = _getFileName.call(self);
    logger.info(`callback: code is ${code}. file is ${file}. About to do something around getting flights`);
    if(fs.existsSync(file)) {
      const maxAgeInMinutes = 120;
      const ctime = (new Date(fs.statSync(file).ctime)).getTime();
      const diffInMinutes = (Date.now()-ctime)/(1000*60);
      if(diffInMinutes < maxAgeInMinutes) { // file's age is less than 120 minutes
        logger.info(`getFlightDetails: file ${file} was created ${diffInMinutes} minutes ago. Simply calling callback.`);
        return callback();
      }
      else {
        logger.info(`getFlightDetails: file ${file} exists but it is older than ${maxAgeInMinutes} minutes (${diffInMinutes} minutes). Calling skyscanner API`);
      }
    }
    _postFlightDetails.call(self, callback);
  });
}

FlightInfoProvider.prototype.getStoredFlightDetails = function() {
  if(_.isUndefined(this.origCode)) {
    this.origCode = new IataCodeGetter(this.origCity).getCodeSync();
  }
  if(_.isUndefined(this.destCode)) {
    this.destCode = new IataCodeGetter(this.destCity).getCodeSync();
  }
  const file = _getFileName.call(this);
  let json;
  try {
    console.log(`getStoredFlightDetails: Reading from file ${file}`);
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  catch(e) {
    logger.warn(`getStoredFlightDetails: Error reading file ${file}: ${e.stack}`);
    return {
      noflight: 'No information yet for this segment'
    };
  }
  const itin = new FlightDataExtractor(json).getItinerary();
  if(_.isUndefined(itin)) {
    logger.warn(`getStoredFlightDetails: did not get itinerary from FlightDataExtractor`);
    return {
      noflight: 'No information yet for this segment'
    };
  }
  const fromTo = `${this.origCity} To ${this.destCity}`;
  const data = {};
  data[fromTo] = itin;
  return data;
}

function _postFlightDetails(callback) {
  logger.info(`_postFlightDetails: Calling skyscanner url. Code for ${this.origCity} is ${this.origCode}; code for ${this.destCity} is ${this.destCode}`);

  const self = this;
  const uri = "http://partners.api.skyscanner.net/apiservices/pricing/v1.0";
  request.post({
    uri: uri,
    headers: {
      Accept: "application/json"
    },
    form: {
      apiKey: apiKey,
      country: "US",
      currency: "USD",
      locale: "en-US",
      originplace: `${this.origCode}-sky`,
      destinationplace: `${this.destCode}-sky`,
      outbounddate: this.startDate,
      inbounddate: this.returnDate,
      adults: "2"
    }
  }, function(err, res, body) {
    if(!_.isUndefined(err) && !_.isNull(err)) {
      logger.error(`Error talking to skyscanner: ${err}`);
      return callback();
    }
    if(res.statusCode == "201") {
      // console.log(`_postFlightDetails: Received response ${JSON.stringify(res)}. calling location ${res.headers.location}`);
      sleep.sleep(2);
      self.locationUrlRetry = 0;
      const location = res.headers.location;
      logger.info(`_getFlightDetails: Calling location ${location}`);
      try {
        const file = _getFileName.call(self);
        fs.writeFileSync(`${file}.lastKnownLocation`,location);
      }
      catch(e) {
        logger.error(`_postFlightDetails. Error writing location url ${location} to file: ${e.stack}`);
      }
      return _getFlightDetails.call(self, res.headers.location, callback);
    }
    // TODO: Handle status code 429 by calling the location written in lastKnownLocation file.
    // TODO: Retry a few times and then fall back to browse overview.
    logger.error(`_postFlightDetails: skyscanner api returned a non-20X status code: res is ${JSON.stringify(res)}`);
    return callback();
  });
}

function _getFlightDetails(location, callback) {
  // console.log(`_getFlightDetails: calling ${location}`);
  const uri = `${location}?apiKey=${apiKey}`;
  const self = this;
  request.get({
    uri: uri,
    headers: {
      Accept: "application/json"
    },
  }, function(err, res, body) {
    const getFlightDetailsHandle = _getFlightDetails.bind(self);
    if(!_.isUndefined(err) && !_.isNull(err)) {
      logger.error(`_getFlightDetaills: Error talking to skyscanner: ${err}`);
      return callback();
    }
    if(res.statusCode == "304" || ((res.statusCode == "200") && (JSON.parse(body).Status == "UpdatesPending"))) {
      if(self.locationUrlRetry < 5) {
        self.locationUrlRetry++;
        logger.info(`_getFlightDetails: Retrying location url: ${location}`);
        setTimeout(getFlightDetailsHandle, 4 * self.locationUrlRetry * 1000, location, callback);
        // return _getFlightDetails.call(self, location, callback);
      }
      else {
        logger.error("_getFlightDetails: Retried the skyscanner location url 5 times, but status is stuck at UpdatesPending. Giving up");
      }
    }
    else if(res.statusCode == "200") {
      console.log(`_getFlightDetails: res is ${res.statusCode}, content length: ${res.headers["content-length"]} bytes`);
      try {
        const file = _getFileName.call(self);
        logger.info(`_getFlightDetails: writing body to file ${file}`);
        fs.writeFileSync(file, body);
      }
      catch(e) {
        logger.error(`_getFlightDetails: Error writing to file: ${e.stack}`);
      }
    }
    else {
      // TODO: Handle status code 429 by backing off and retrying location url in a bit.
      console.log(`_getFlightDetails: location url returned non-20X status code: res is ${JSON.stringify(res)}. Retrying in 60 seconds.`);
      setTimeout(getFlightDetailsHandle, 60 * 1000, location, callback);
    }
    return callback();
  });
}

function _getFileName() {
  return `flights/${this.origCode}to${this.destCode}on${this.startDate}.txt`;
}

/*
[ec2-user@ip-172-31-55-42 ~]$ node test-flight-info-provider.js 
Code for seattle is SEA; code for lisbon is LIS
Doing nothing
_postFlightDetails: res is {"statusCode":201,"body":"{}","headers":{"cache-control":"private","content-type":"application/json","date":"Tue, 03 Jan 2017 06:25:03 GMT","location":"http://partners.api.skyscanner.net/apiservices/pricing/uk1/v1.0/04f8eb1187874d678408f1785b4d740d_ecilpojl_9F8FCC373985856E60C7406085298F65","connection":"close","content-length":"2"},"request":{"uri":{"protocol":"http:","slashes":true,"auth":null,"host":"partners.api.skyscanner.net","port":80,"hostname":"partners.api.skyscanner.net","hash":null,"search":null,"query":null,"pathname":"/apiservices/pricing/v1.0","path":"/apiservices/pricing/v1.0","href":"http://partners.api.skyscanner.net/apiservices/pricing/v1.0"},"method":"POST","headers":{"Accept":"application/json","content-type":"application/x-www-form-urlencoded","content-length":177}}}
*/

module.exports = FlightInfoProvider;
