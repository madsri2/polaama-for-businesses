'use strict';
const fs = require('fs');

if(process.argv.length < 6) {
  console.log(`usage: node update-user-itinerary.js <tripname> <date> <set> <idx>`);
  return;
}

const fbid = "aeXf";
const tripName = process.argv[2];
const day = process.argv[3];
const set = process.argv[4];
const idx = process.argv[5];
const baseDir = `/home/ec2-user/trips/${fbid}`;
const file = `${baseDir}/${tripName}-user-itinerary.json`;
const userItin = JSON.parse(fs.readFileSync(file, 'utf8'));
const dayItin = JSON.parse(fs.readFileSync(`${baseDir}/${tripName}-${day}-itinerary.json`, 'utf8'))

const item = dayItin[set][idx];
console.log(JSON.stringify(item));
