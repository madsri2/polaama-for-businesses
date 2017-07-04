'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

const FlightInfo = require('flight-details-parser/app/flight-info');

// An Itinerary's flight_info object contains more fields than a boarding pass flight_info: See https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-itinerary-template (flight_info object)
function ItineraryFlightInfo(options) {
  this.details = [];
  const flightCount = options.flight_num.length;
  const optionMap = toMap.call(this, options);
  for(let i = 0; i < flightCount; i++) {
    const item = new FlightInfo(optionMap[i]).get();
    item.connection_id = `c00${i+1}`;
    item.segment_id = `s00${i+1}`;
    /*
    const tc = optionMap[i].travel_class;
    if(!tc) throw new Error(`required field travel_class missing for flight ${optionMap[i].flight_num}`);
    if(tc != 'economy' && tc != 'business' && tc != 'first_class') throw new Error(`travel class needs to be one of economy, business, first_class. But it is ${tc}. flight_num is ${options.flight_num[i]}`);
    item.travel_class = tc;
    */
    this.details.push(item);
  }
}

function toMap(options) {
  const optionMap = [];
  const flightCount = options.flight_num.length;
  for(let i = 0; i < flightCount; i++) {
    const item = {};
    Object.keys(options).forEach(key => {
      if(Array.isArray(options[key])) item[key] = options[key][i];
      else item[key] = options[key];
    });
    optionMap.push(item);
  }
  return optionMap;
}

ItineraryFlightInfo.prototype.get = function() {
  return this.details;
}

module.exports = ItineraryFlightInfo;
