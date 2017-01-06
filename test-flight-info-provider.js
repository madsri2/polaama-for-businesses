'use strict';
const FlightInfoProvider = require('./flight-info-provider');

function testGetFlightDetails() {
  const fip = new FlightInfoProvider("seattle", "lisbon", "2/3/17", "2/17/17");
  fip.getFlightDetails(function() {
    console.log("test-flight-info-provider: Doing nothing");
  });
}

const fs = require('fs');
function testExtractDataFromFile() {
  const fip = new FlightInfoProvider("seattle", "lisbon", "2/3/17", "2/17/17");
  const content = fip.getStoredFlightDetails();
  console.log(`test-flight-info-provider: content: <${JSON.stringify(content, null, 2)}>`);
  /*
  const file = "flights/SEAtoLISon2017-02-03.txt";
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(Object.keys(json));
  */
}

testExtractDataFromFile();
// testGetFlightDetails();
