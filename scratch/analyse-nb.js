'use strict';

const fs = require('fs');

function analyze() {
  const json = JSON.parse(fs.readFileSync('/tmp/airlines'));
  let numAirlines = 0;
  let notAirlines = 0;
  json.forEach(company => {
    if(company.description.includes("airline")) numAirlines++; else {
      notAirlines++;
      console.log(company.description);
    }
  });
  console.log(`There were ${numAirlines} descriptions with the word airlines and ${notAirlines} without`);
}

const Categorizer = require('categorizer');
function train() {
  const desc = fs.readFileSync('/tmp/airlines.descriptions').split('\n');
  desc.forEach(line => {
    
  });
}
