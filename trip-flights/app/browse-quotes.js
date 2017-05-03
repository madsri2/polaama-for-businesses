'use strict';

const baseDir = "/home/ec2-user";
const IataCodeGetter = require(`${baseDir}/iatacode-getter`);
const logger = require(`${baseDir}/my-logger`);

const Promise = require('promise');
const moment = require('moment');
const request = require('request');
const SecretManager = require('secret-manager/app/manager');
const _ = require('lodash');
const fs = require('fs');
require('promise/lib/rejection-tracking').enable(
  {allRejections: true}
);

function BrowseQuotes(origCity, destCity, startDate, returnDate) {
  this.origCity = origCity;
  this.destCity = destCity;
  this.origCode = new IataCodeGetter(origCity).getCodeSync();
  this.destCode = new IataCodeGetter(destCity).getCodeSync();
  this.startDate = startDate;
  this.returnDate = returnDate;
}

BrowseQuotes.prototype.getCachedQuotes = function() {
  const self = this;
  return new Promise(
    function(fulfil, reject) {
      (new IataCodeGetter(self.origCity)).getCode(
        function(result) {
          if(result instanceof Error) return reject(result);
          self.origCode = result;
          fulfil(true); 
        });
    }
  ).then(
    function(result) {
      logger.info(`second promise: entering`);
      return new Promise(
        function(fulfil, reject) {
          (new IataCodeGetter(self.destCity)).getCode(
            function(result) {
              if(result instanceof Error) return reject(result);
              self.destCode = result;
              if(!self.origCode || !self.destCode) {
                // no point in proceeding if either dest or orig code is missing.
                logger.warn(`getCachedQuotes: either origCode or destCode is undefined [origCode: ${self.origCode}; destCode: ${self.destCode}]. Not proceeding with getting flight details!`);
                return reject(new Error(`Either origCode or destCode is undefined`));
              }
              fulfil(result);
            }
          );
        }
      );  
    },
    function(err) {
      logger.error(`first promise failed: error: ${err.stack}`);
      throw err;
    }
  ).then(
    function(result) {
      const file = getFileName.call(self);
      logger.info(`getCachedQuotes: origCode is ${self.origCode}; destCode is ${self.destCode}. file is ${file}. About to do something around getting flights`);
      if(fs.existsSync(file)) {
        const maxAgeInMinutes = 30;
        const ctime = (new Date(fs.statSync(file).ctime)).getTime();
        const diffInMinutes = (Date.now()-ctime)/(1000*60);
        if(diffInMinutes < maxAgeInMinutes) { // file's age is less than maxAge
          logger.info(`getCachedQuotes: file ${file} was created ${diffInMinutes} minutes ago, which is less than ${maxAgeInMinutes} minutes. done!`);
          return true;
        }
        logger.info(`getCachedQuotes: file ${file} exists but it is older than ${maxAgeInMinutes} minutes (${diffInMinutes} minutes). Calling skyscanner API`);
      }
      return getQuotesFromSkyscanner.call(self); // returns a promise
    },
    function(err) {
      logger.error(`getCachedQuotes: second promise failed: ${err.stack}`);
      throw err;
    }
  );
}

function getQuotesFromSkyscanner() {
  const self = this;
  return new Promise(function(fulfil, reject) {
    const uri = "http://partners.api.skyscanner.net/apiservices/browsequotes/v1.0/US/USD/en-US"
              .concat(`/${self.origCode}`)
              .concat(`/${self.destCode}`)
              .concat(`/${self.startDate}`)
              .concat(`/${self.returnDate}`);
    request({
      uri: uri,
      headers: { Accept: "application/json" },
      qs: { apiKey: (new SecretManager()).getSkyscannerApiKey() }
    }, function(err, res, body) {
      if(!_.isUndefined(err) && !_.isNull(err)) {
        logger.error(`Error talking to skyscanner: ${err}`);
        return reject(err);
      }
      if(res.statusCode == "200") {
        return fulfil(body);
      }
      logger.error(`getQuotesFromSkyscanner: skyscanner api returned a non-20X status code: res is ${JSON.stringify(res)}`);
      reject(new Error(`skyscanner api returned status code ${res.statusCode}. Link is ${res.href}`));
    });
  }).then(
    function(contents) {
      if(!contents) throw new Error(`getQuotesFromSkyscanner: response body is undefined`);
      return new Promise(function(fulfil, reject) {
        fs.writeFile(getFileName.call(self), contents, 
          function(err, res) {
            if(err) return reject(new Error(err));
            fulfil(true);
          }
        );
      });
    },
    function(err) {
      logger.error(`third promise failed: ${err.stack}`);
      throw err;
    }
  );
}

BrowseQuotes.prototype.getStoredQuotes = function() {
  const file = getFileName.call(this);
  const self = this;
  return new Promise(
    function(fulfil, reject) {
      fs.readFile(file, (err, contents) => {
        if(err) { 
          logger.error(`getStoredQuotes: Error from response: ${err}`); 
          return reject(err);
        }
        fulfil(JSON.parse(contents));
      });
    }
  ).then(
    function(contents) { return parseQuoteContents.call(self, contents); },
    function(err) { throw new Error(err); }
  );
}

// first extract the quotes into the right buckets. Then, aggregate exclusive outbound and inbound quotes into a single object and create the final list.
function updateContents(rawContents) {
  // first get the exclusive lists.
  const xclusiveOutboundList = [];
  const xclusiveInboundList = [];
  const roundtripList = [];
  rawContents.forEach(item => {
    if(item.OutboundLeg && item.InboundLeg) {
      const depDate = new Date(item.OutboundLeg.DepartureDate).toISOString();
      const retDate = new Date(item.InboundLeg.DepartureDate).toISOString();
      if(moment(depDate).isSame(moment(this.startDate)) &&
         moment(retDate).isSame(moment(this.returnDate))) roundtripList.push(item); 
    }
    if(item.OutboundLeg && !item.InboundLeg && moment(new Date(item.OutboundLeg.DepartureDate).toISOString()).isSame(moment(this.startDate))) return xclusiveOutboundList.push(item);
    if(item.InboundLeg && !item.OutboundLeg && moment(new Date(item.InboundLeg.DepartureDate).toISOString()).isSame(moment(this.returnDate))) return xclusiveInboundList.push(item);
  }, this);
  const contents = roundtripList;
  logger.debug(`roundtrip list: ${roundtripList.length} items`);
  logger.debug(`outbound: ${xclusiveOutboundList.length} items`);
  logger.debug(`inbound: ${xclusiveInboundList.length} items`);
  xclusiveOutboundList.forEach(item => {
    xclusiveInboundList.forEach(inbound => {
      const oblistItem = JSON.parse(JSON.stringify(item));
      oblistItem.MinPrice += inbound.MinPrice;
      oblistItem.InboundDirect = inbound.Direct;
      oblistItem.InboundLeg = inbound.InboundLeg;
      oblistItem.InboundQuoteDateTime = inbound.QuoteDateTime;
      oblistItem.InboundQuoteId = inbound.QuoteId;
      contents.push(oblistItem);
    });
  });
  return contents;
}

// approach: First sort by Direct vs. Non-direct. Then sort by cached time. Then sort by price. Finally, massage the quotes in the required format and resolve duplicates.
function parseQuoteContents(rawContents) {
  this.rawQuoteDetails = rawContents;
  const contents = updateContents.call(this, rawContents.Quotes);
  const sortedQuotes = contents.sort(function(a,b) {
      if(a.Direct && !b.Direct) return -1;
      if(b.Direct && !a.Direct) return 1;
      return 0;
  }).sort(function(a,b) {
    // we want the later date object in the lower index.
      if(moment(a.QuoteDateTime).isBefore(b.QuoteDateTime)) return 1;
      return -1;
  }).sort(function(a,b) {
      return a.MinPrice - b.MinPrice;
  });
  return resolveDuplicates(getFinalQuotesList.call(this, sortedQuotes));
}

/*
[1,1,2,3,2]
[1,2,3]

duplicateIndices: [1,4]
slice(0,1) -> [1]
concat slice(2,4) -> [1,2,3]
*/
// TODO: In the future, compare quotes whose carriers match and choose the one that was cached later.
function resolveDuplicates(quotes) {
  const duplicateIndices = [];
  for(let i = 0; i < quotes.length; i++) {
    const quote = quotes[i];
    for(let j = i+1; j < quotes.length; j++) {
      // if the price and ongoing & return carriers match, mark this entry for removal
      if(quote.price === quotes[j].price &&
         match(quote.originCarrier, quotes[j].originCarrier) &&
         match(quote.returnCarrier, quotes[j].returnCarrier)) {
        duplicateIndices.push(j);
        logger.debug(`skipping quote at index ${j} (quote id: ${quotes[j].id}) which is same as quote at index ${i} (quote id: ${quotes[i].id})`);
      }
    }
  }
  let start = 0;
  let finalList = [];
  for(let i = 0; i < duplicateIndices.length; i++) {
    finalList = finalList.concat(quotes.slice(start, duplicateIndices[i]));
    start = duplicateIndices[i] + 1;
  }
  finalList = finalList.concat(quotes.slice(start, quotes.length));
  return finalList;
}

// compare equality of two arrays
function match(array1, array2) {
  return (array1.length === array2.length) && array1.every((element, index) => {
    return element === array2[index];
  });
}

function getFinalQuotesList(flightQuotes) {
  const finalQuotes = [];
  const limit = flightQuotes.length > 5 ? 5 : flightQuotes.length;
  for(let i = 0; i < limit; i++) {
    const quote = {};
    const thisQuote = flightQuotes[i];
    quote.id = thisQuote.QuoteId;
    quote.price = thisQuote.MinPrice;
    quote.originCarrier = [];
    thisQuote.OutboundLeg.CarrierIds.forEach(id => {
      quote.originCarrier.push(getCarrierName.call(this, id));
    });
    quote.originDirect = thisQuote.Direct;
    quote.returnCarrier = [];
    quote.returnDirect = thisQuote.Direct;
    thisQuote.InboundLeg.CarrierIds.forEach(id => {
      quote.returnCarrier.push(getCarrierName.call(this, id));
    });
    quote.cacheTime = thisQuote.QuoteDateTime;
    finalQuotes.push(quote);
  }
  finalQuotes.departureDate = this.startDate;
  finalQuotes.returnDate = this.returnDate;
  return finalQuotes;
}

function getCarrierName(id) {
  const carriers = this.rawQuoteDetails.Carriers;
  for(let i = 0; i < carriers.length; i++) {
    if(carriers[i].CarrierId === id) return carriers[i].Name;
  };
  throw new Error(`No carrier found for id ${id} in key Carriers`);
}

function getFileName() {
  return `${baseDir}/flights/${this.origCode}to${this.destCode}on${this.startDate}-cached.txt`;
}

/***** TESTING ****/
BrowseQuotes.prototype.testing_parseQuoteContents = parseQuoteContents;
BrowseQuotes.prototype.testing_resolveDuplicates = resolveDuplicates;

module.exports = BrowseQuotes;
