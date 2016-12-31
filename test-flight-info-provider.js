'use strict';
const FlightInfoProvider = require('./flight-info-provider');

function testGetFlightDetails() {
  const fip = new FlightInfoProvider("seattle", "lisbon", "2/3/17", "2/17/17");
  fip.getFlightDetails(function(code) {
    console.log(`${city} code is ${code}`);
  });
}

testGetFlightDetails();
