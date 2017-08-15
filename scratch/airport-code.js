'use strict';
const airport = require('airport-codes');
// console.log(airport.findWhere({iata:'JFK'}).get('city'));

function testPopularCities() {
  const baseDir =  "/home/ec2-user";
  const popularAirports = JSON.parse(require('fs').readFileSync(`${baseDir}/countries/cities.multiple_airports`));
  Object.keys(popularAirports).forEach(key => {
    popularAirports[key.toLowerCase()] = popularAirports[key];
    delete popularAirports[key];
  });

  console.log(`${JSON.stringify(popularAirports)}`);
}

testPopularCities();
