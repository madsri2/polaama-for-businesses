'use strict';
const fs = require('fs');

const file = "flights/SEAtoLISon2017-02-03.txt";
const json = JSON.parse(fs.readFileSync(file, 'utf8'));
console.log(`Keys are ${Object.keys(json)}`);

const legId = "16177-1702032119--32171,-31781-1-13577-1702050605";
const leg = _findLeg(legId);
console.log(`${JSON.stringify(leg, null, 2)}`);
// console.log(`${JSON.stringify(json.Carriers, null, 2)}`);
// _findCarriers(leg.FlightNumbers);
_findSegments(leg.SegmentIds);
// 870, 1760

function _findCarriers(flightDetails) {
  const names = [];
  const carriers = json.Carriers;
  flightDetails.forEach(flight => {
    const id = flight.CarrierId;
    carriers.forEach(carrier => {
      if(carrier.Id === id) {
        console.log(`Carrier: ${JSON.stringify(carrier, null, 2)}`);
        names.push(carrier.Name);
      }
    });
  });
  return names;
}
 
function _findSegments(segIds) {
  const segments = json.Segments;
  segIds.forEach(id => {
    segments.forEach(segment => {
      if(segment.Id === id) {
        console.log(`Segment: ${JSON.stringify(segment, null, 2)}`);
      }
    });
  });
}

function _findLeg(id) {
  const legs = json.Legs;
  for(let i = 0; i < legs.length; i++) {
    if(legs[i].Id == id) {
      return legs[i];  
    }
  }
}
