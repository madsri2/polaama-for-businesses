'use strict';

const Promise = require('promise');
const fs = require('fs');

const baseDir = "/home/ec2-user";
const file = `${baseDir}/countries/airports.dat`;
const promise = require('readline-promise').createInterface({
    input: require('fs').createReadStream(file)
  }).each(function(line) {
    const contents = line.split(',');
    console.log(`${contents[1]}: ${contents[11]}, ${contents[12]}`);
  }).catch(function(err) {
    logger.error(`AirportCodes: error in promise`);
    throw err;
  });
  promise.done(
    function(r) {
      console.log(`done: ${JSON.stringify(r)}`);
    },
    function(e) {
      console.log(`error: ${e.stack}`);
    }
  );
