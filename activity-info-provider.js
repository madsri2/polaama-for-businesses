'use strict';
const fs = require('fs');
const logger = require('./my-logger');
const request = require('request');
const _ = require('lodash');
const moment = require('moment');

// GET https://www.googleapis.com/customsearch/v1?q=best+cities+to+visit+portugal+in+february&cx=016727128883863036563%3Azuqchmgec0u&exactTerms=portugal&key=AIzaSyAKOhBJ0jUpku5AhKnclyBzCi0eoJLc0r0
/*
  Search Terms:
  1) Details about city: "cityName tourism trip advisor", "cityName country lonely planet"
  2) Details about things to do: "cityName attractions trip advisor" 
*/

function ActivityInfoProvider(country, city, travelDate) {
  this.country = country;
  this.city = city;
  const isoDate = new Date(travelDate).toISOString();
  const month = moment().month(moment(isoDate).month()).format("MMMM").toLowerCase(); 
  this.count = 0;
  this.links = [];

  this.url = "https://www.googleapis.com/customsearch/v1?q=${search-term}&cx=016727128883863036563%3Azuqchmgec0u&exactTerms=${exact-term}&key=AIzaSyAKOhBJ0jUpku5AhKnclyBzCi0eoJLc0r0";
  this.details = {
    "trip-advisor": {
      "search-term": `trip+advisor+${this.city}+${month}+tourism`,
      "filter": ["tourism", `${month}`],
      "exact-term": `${this.country} ${this.city} ${month}` // the term that should appear in every page before it will be included.
    }
  };
  this.activities = {
    "lonely-planet": {
      "search-term": `lonely+planet+${this.city}+${month}+things+to+do`,
      "filter": ["things-to-do", "attractions", "activities"],
      "exact-term": `${this.city}`
    },
    "trip-advisor": {
      "search-term": `trip+advisor+${this.city}+${month}+attractions`,
      "filter": ["attractions", "attraction_review"],
      "exact-term": `${this.city}`
    }
  };
}

ActivityInfoProvider.prototype.getActivities = function(responseCallback) {
  this.callback = responseCallback;
  Object.keys(this.activities).forEach(key => {
    const srFile = srFileName.call(this, key);
    try {
      fs.statSync(srFile).isFile();
      // logger.info(`file ${srFile} exists. Extracting details.`);
      // nothing to do if the file exists;
      return extractActivityDetails.call(this, key);
    }
    catch(e) {
      if(e.code != 'ENOENT') {
        logger.error(`getActivities: Encountered error in stating file ${srFile}: ${e.stack}`);
      }
      else {
        // file not present. Get it from google's custom search and update the file.
        logger.info(`getActivities: ${srFile} does not exist. Getting it with custom search`);
      }
    }
    const url = this.url.replace("${search-term}",this.activities[key]["search-term"]).replace("${exact-term}",this.activities[key]["exact-term"]);
    logger.info(`getActivities: using url ${url}`);
    const self = this;
    request({
      uri: url,
      method: 'GET',
    },
    function(err, res, body) {
      if(!err & res.statusCode == 200) {
        try {
          logger.info(`getActivities: ${key} anon function: writing results to file ${srFile}`);
          fs.writeFileSync(srFile,body);
          return extractActivityDetails.call(self, key);
        }
        catch(e) {
          logger.error(`getActivities: could not write data from custom search into file ${srFile}: ${e.stack}.`);
          return extractActivityDetails.call(self, key);
        }
      }
      else {
        logger.error("getActivities: Unable to send request to google: Response: ",res,"; Error: ",error);
        return extractActivityDetails.call(self, key);
      }
    });
  }, this);
}

function srFileName(key) {
 return `countries/${this.country}/${this.city}-${this.activities[key]["search-term"]}.txt`;
}

function extractActivityDetails(key) {
  this.count++;
  const srFile = srFileName.call(this, key);
  let body = "";
  try {
    body = fs.readFileSync(srFile, 'utf8');
    console.log(`read ${body.length} bytes from file ${srFile}`);
  }
  catch(e) {
    logger.error(`extractActivityDetails: could not read from file ${srFile}: ${e.stack}`);
    return determineResponse.call(this);
  }
  const json = JSON.parse(body);
  if(_.isUndefined(json.items)) {
    logger.error("extractActivityDetails: Custom search results does not contain items property.");
    return determineResponse.call(this);
  }
  json.items.forEach(item => {
    this.activities[key].filter.forEach(term => {
      if(item.link.toLowerCase().indexOf(term) > -1) {
        this.links.push(item.link);
      }
    });
  });
  return determineResponse.call(this);
}

// determine if we need to call the callback
function determineResponse() {
  if(this.count == Object.keys(this.activities).length) {
    if(this.links.length == 0) {
      console.log("No links found");
      return this.callback(undefined);
    }
    return this.callback(this.links);
  }
  return;
}

module.exports = ActivityInfoProvider;
