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

function FlightInfoProvider(origCity, destCity, startDate, returnDate) {
  this.origCity = origCity;
  this.destCity = destCity;
  // this.startDate = moment(new Date(startDate).toISOString()).format("YYYY-MM-DD");
  // this.returnDate = moment(new Date(returnDate).toISOString()).format("YYYY-MM-DD");
  this.startDate = startDate;
  this.returnDate = returnDate;
}

FlightInfoProvider.prototype.getFlightDetails = function(callback) {
  const self = this;
  (new IataCodeGetter(this.origCity)).getCode(function(code) { self.origCode = code;});
  (new IataCodeGetter(this.destCity)).getCode(function(code) {
    self.destCode = code;
    // Check if the flights file was created only 30 minutes ago and if so, short circuit.
    const file = _getFileName.call(self);
    if(fs.existsSync(file)) {
      logger.info(`getFlightDetails: file ${file} exists. Simply calling callback.`);
      return callback();
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
      noflight: 'No information for this segment'
    };
  }
  const itin = new FlightDataExtractor(json).getItinerary();
  if(_.isUndefined(itin)) {
    logger.warn(`getStoredFlightDetails: did not get itinerary from FlightDataExtractor`);
    return {
      noflight: 'No information for this segment'
    };
  }
  const fromTo = `${this.origCity} To ${this.destCity}`;
  const data = {};
  data[fromTo] = itin;
  return data;
}

function _postFlightDetails(callback) {
  console.log(`Code for ${this.origCity} is ${this.origCode}; code for ${this.destCity} is ${this.destCode}`);

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
      sleep.sleep(1);
      return _getFlightDetails.call(self, res.headers.location, callback);
    }
    // TODO: Retry a few times and then fall back to browse overview.
    console.log(`_postFlightDetails: res is ${JSON.stringify(res)}`);
    return callback();
  });
}

function _getFlightDetails(location, callback) {
  console.log(`_getFlightDetails: calling ${location}`);
  const uri = `${location}?apiKey=${apiKey}`;
  const self = this;
  request.get({
    uri: uri,
    headers: {
      Accept: "application/json"
    },
  }, function(err, res, body) {
    if(!_.isUndefined(err) && !_.isNull(err)) {
      logger.error(`_getFlightDetaills: Error talking to skyscanner: ${err}`);
      return callback();
    }
    if(res.statusCode == "200") {
      // TODO: Handle the case where this.json.Status = UpdatesPending (we need to retry until this value is UpdatesCompleted
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
      console.log(`_getFlightDetails: res is ${JSON.stringify(res)}`);
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
