'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();

const BrowseQuotes = require(`${baseDir}/trip-flights/app/browse-quotes`);
const Promise = require('promise');

const promise = (new BrowseQuotes("san francisco", "austin", "8/1/2017", "8/8/2017")).getCachedQuotes();
logger.debug(`PROMISE: ${promise}`);
promise.done(
      function(result) { 
        logger.debug(`Result from browse quotes: ${result}`); 
      },
      function(err) {
        logger.error(`Error: ${err}`);
      }
);
