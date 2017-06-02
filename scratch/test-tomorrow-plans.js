'use strict';
const Tomorrow = require('trip-itinerary/app/plans-for-tomorrow');
const TripData = require('/home/ec2-user/trip-data');
const trip = new TripData("albuquerque","1120615267993271");
console.log(new Tomorrow(trip, "seattle").get());
