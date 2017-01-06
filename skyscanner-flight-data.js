'use strict';
const _ = require('lodash');
const logger = require('./my-logger');

function FlightDataExtractor(json) {
  this.json = json;
  console.log(`There are ${this.json.Itineraries.length} itineraries. Json keys are ${Object.keys(json)}`); // Itin keys are ${Object.keys(json.Itineraries[0]};`);
  this.itin = [];
  for(let i = 0; i < 1; i++) {
    const itinDetails = this.json.Itineraries[i];
    // console.log(Object.keys(itin.PricingOptions));
    this.itin[i] = {
      outbound : _getLegDetails.call(this, itinDetails.OutboundLegId),
      inbound : _getLegDetails.call(this, itinDetails.InboundLegId),
    };
    this.itin[i].options = [];
    for(let j = 0; j < 1; j++) {
      if(!_.isUndefined(itinDetails.PricingOptions[j])) {
        this.itin[i].options.push({
          price : itinDetails.PricingOptions[j].Price,
          uri : itinDetails.PricingOptions[j].DeeplinkUrl, // http://tinyurl.com/api-create.php?url=http://scripting.com/
          agent: _findValue.call(this, "Agents", itinDetails.PricingOptions[j].Agents[0]).Name,
        });
      }
    }
    // console.log(`Itinerary ${i}: ${JSON.stringify(this.itin[i], null, 2)}`);
  }
}

FlightDataExtractor.prototype.getItinerary = function() {
  return this.itin;
}

// Departure & duration in json.Legs
// Airport information in json.Places
// Airline information in Carriers
// Flight details about each leg in the journey: json.Segment
function _getLegDetails(id) {
  const leg = _findValue.call(this, "Legs", id);
  // console.log(JSON.stringify(leg, null, 2));
  const legDetails = {
    id: id,
    arrival: leg.Arrival,
    departure: leg.Departure,
    duration: `${(leg.Duration/60).toFixed(2)} hours`,
    stops: leg.SegmentIds.length,
    segmentDetails: _segmentDetails.call(this, leg.SegmentIds)
  };
  return legDetails;
}

function _segmentDetails(segmentIds) {
  const details = []
  const self = this;
  segmentIds.forEach(id => {
    const segment = _findValue.call(this, "Segments", id);
    if(_.isUndefined(segment)) {
      logger.error(`_segmentDetails: Could not find segment for id ${id}`);
      return;
    }
    const segDetail = {
      segmentId: segment.Id,
      origin: _findValue.call(self, "Places", segment.OriginStation).Code,
      destination: _findValue.call(self, "Places", segment.DestinationStation).Code,
      departure: segment.DepartureDateTime,
      arrival: segment.ArrivalDateTime,
      duration: `${(segment.Duration/60).toFixed(2)} hours`,
      airlines: _findValue.call(self, "Carriers", segment.Carrier).Name,
      flightNum: segment.FlightNumber,
    };
    details.push(segDetail);
  });
  return details;
}

function _findValue(key, id) {
  const values = this.json[key];
  if(_.isUndefined(values)) {
    logger.error(`_findValue: Did not find key ${key} in this.json`);
    return undefined;
  }
  for(let i = 0; i < values.length; i++){
    if(values[i].Id === id) {
      return values[i];
    }
  }
  logger.error(`_findValue: Did not find id ${id} for key ${key} in this.json`);
  return undefined;
}

module.exports = FlightDataExtractor;
