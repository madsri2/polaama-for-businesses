'use strict';
const airport = require('airport-codes');
console.log(airport.findWhere({iata:'JFK'}).get('city'));
