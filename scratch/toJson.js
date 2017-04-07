'use strict';

console.log(JSON.stringify(JSON.parse(require('fs').readFileSync("/home/ec2-user/trips/full-itin-test-itinerary.txt",'utf8')), null, 2));
