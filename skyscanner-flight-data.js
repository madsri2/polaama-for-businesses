'use strict';
const _ = require('lodash');

function FlightDataExtracter(json) {
  this.json = json;
  console.log(`There are ${this.json.Itineraries.length} itineraries. Json keys are ${Object.keys(json)}`); // Itin keys are ${Object.keys(json.Itineraries[0]};`);
  this.itin = [];
  for(let i = 0; i < 5; i++) {
    const itinDetails = this.json.Itineraries[i];
    // console.log(Object.keys(itin.PricingOptions));
    this.itin[i] = {
      outbound : _getLegDetails.call(this, itinDetails.OutboundLegId),
      inbound : _getLegDetails.call(this, itinDetails.InboundLegId),
    };
    this.itin[i].options = [];
    for(let j = 0; j < 5; j++) {
      if(!_.isUndefined(itinDetails.PricingOptions[j])) {
        this.itin[i].options.push({
          price : itinDetails.PricingOptions[j].Price,
          uri : itinDetails.PricingOptions[j].DeeplinkUrl, // http://tinyurl.com/api-create.php?url=http://scripting.com/
          agent: _findAgent.call(this, itinDetails.PricingOptions[j].Agents[0]).Name,
        });
      }
    }
    console.log(`Itinerary ${i}: ${JSON.stringify(this.itin[i], null, 2)}`);
  }
}

// Departure & duration in json.Legs
// Airport information in json.Places
// Airline information in Carriers
// Flight details about each leg in the journey: json.Segment
function _getLegDetails(id) {
  const leg = _findLeg.call(this, id);
  // console.log(JSON.stringify(leg, null, 2));
  const legDetails = {
    id: id,
    departure: leg.Departure,
    duration: `${(leg.Duration/60).toFixed(2)} hours`,
    stops: leg.Stops.length,
    flightDetails: _findCarriers.call(this, leg.FlightNumbers)
  };
  return legDetails;
}

function _findCarriers(flightDetails) {
  const names = [];
  const carriers = this.json.Carriers;
  flightDetails.forEach(flight => {
    const id = flight.CarrierId;
    carriers.forEach(carrier => {
      if(carrier.Id === id) {
        names.push(carrier.Name);
      }
    });
  });
  return names;
}

function _findAgent(id) {
  const agents = this.json.Agents;
  for(let i = 0; i < agents.length; i++) {
    if(agents[i].Id === id) {
      return agents[i];
    }
  }
  return undefined;
}

function _findLeg(id) {
  const legs = this.json.Legs;
  for(let i = 0; i < legs.length; i++) {
    if(legs[i].Id == id) {
      return legs[i];  
    }
  }
}

module.exports = FlightDataExtracter;
