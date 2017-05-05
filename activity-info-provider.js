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
    if(fs.existsSync(srFile)) {
      // logger.info(`getActivities: file ${srFile} exists. Extracting details`);
      // nothing to do if the file exists;
      return extractActivityDetails.call(this, key);
    }
    // file not present. Get it from google's custom search and update the file.
    const url = this.url.replace("${search-term}",this.activities[key]["search-term"]).replace("${exact-term}",this.activities[key]["exact-term"]);
    logger.info(`getActivities: file ${srFile} does not exist. Getting it with custom search url ${url}`);
    const self = this;
    request({
      uri: url,
      method: 'GET',
    },
    function(err, res, body) {
      if(!err & res.statusCode == 200) {
        try {
          fs.writeFileSync(srFile,body);
          return extractActivityDetails.call(self, key);
        }
        catch(e) {
          logger.error(`getActivities: could not write data from custom search for key ${key} to file ${srFile}: ${e.stack}`);
          return extractActivityDetails.call(self, key);
        }
      }
      else {
        logger.error(`getActivities: Unable to send request to google for key ${key}: Response: ${res}, Error: ${error}`);
        return extractActivityDetails.call(self, key);
      }
    });
  }, this);
}

function srFileName(key) {
  // create directory if it does not exist
  const dir = `countries/${this.country}`;
  if(!fs.existsSync(dir)) {
    logger.info(`srFileName: Directory ${dir} not present. creating it`);
    fs.mkdirSync(dir);
  }
  return `${dir}/${this.city}-${this.activities[key]["search-term"]}.txt`;
}

// if the call was successful, srFileName would have the details of the search results. Obtain the links from there and determine if we have obtained links from all the search sites listed in this.activities. If we are, call the callback and we are done. Note that we will always call the callback (even on error from google or the search site) as long as we reach this function from getActivities (see above).
function extractActivityDetails(key) {
  this.count++;
  const srFile = srFileName.call(this, key);
  let body = "";
  try {
    body = fs.readFileSync(srFile, 'utf8');
  }
  catch(e) {
    logger.error(`extractActivityDetails: could not read from file ${srFile}: ${e.stack}`);
    return determineResponse.call(this);
  }
  const json = JSON.parse(body);
  if(_.isUndefined(json.items)) {
    logger.error("extractActivityDetails: Custom search results from file ${srFile} does not contain items property.");
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

// determine if we need to call the callback. If we have obtained links from all the search sites defined in this.activities, we are ready to call the callback.
function determineResponse() {
  if(this.count == Object.keys(this.activities).length) {
    if(this.links.length == 0) {
      logger.warn("determineResponse: No links found from any of the files");
      return this.callback([`No activity information available for ${this.city}`]);
    }
    return this.callback(this.links);
  }
  return;
}

module.exports = ActivityInfoProvider;
