'use strict';
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();

const expect = require('chai').expect;
const BrowseQuotes = require('trip-flights/app/browse-quotes');
const Promise = require('promise');

describe("Browse Quotes tests", function() {
  it("testing cached quotes", function(done) {
    this.timeout(5000); // mocha's timeout
    const promise = (new BrowseQuotes("san francisco", "austin", "2017-08-01", "2017-08-08")).getCachedQuotes();
    promise.then(
      function(result) { 
        logger.debug(`Result from browse quotes: ${result}`); 
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("testing parsing quote contents", function() {
    const contents = {
      Quotes: [{
        "QuoteId": 1,
        "MinPrice": 438,
        "Direct": true,
        "OutboundLeg": {
          "CarrierIds": [
            1864
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-14T00:00:00"
        },
        "QuoteDateTime": "2017-04-27T06:19:00"
      },
      {
        "QuoteId": 2,
        "MinPrice": 438,
        "Direct": true,
        "OutboundLeg": {
          "CarrierIds": [
            1864
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-14T00:00:00"
        },
        "QuoteDateTime": "2017-04-27T22:26:00"
      },
      {
        "QuoteId": 3,
        "MinPrice": 347,
        "Direct": false,
        "OutboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-01T00:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-04T00:00:00"
        },
        "QuoteDateTime": "2017-04-21T22:23:00"
      },
      {
        "QuoteId": 4,
        "MinPrice": 345,
        "Direct": false,
        "OutboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 81727,
          "DestinationId": 40979,
          "DepartureDate": "2017-05-14:00:00"
        },
        "InboundLeg": {
          "CarrierIds": [
            1065
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-19:00:00"
        },
        "QuoteDateTime": "2017-04-24T20:55:00"
      },
      {
        "QuoteId": 5,
        "MinPrice": 316,
        "Direct": true,
        "InboundLeg": {
          "CarrierIds": [
            851
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-19:00:00"
        },
        "QuoteDateTime": "2017-04-25T03:49:00"
      },
      {
        "QuoteId": 6,
        "MinPrice": 209,
        "Direct": false,
        "InboundLeg": {
          "CarrierIds": [
            851
          ],
          "OriginId": 40979,
          "DestinationId": 81727,
          "DepartureDate": "2017-05-19:00:00"
        },
        "QuoteDateTime": "2017-04-24T22:04:00"
      }],
      Carriers: [
        {
          "CarrierId": 1864,
          "Name": "Virgin America",
        },
        {
          "CarrierId": 851,
          "Name": "Alaska Airlines"
        },
        {
          "CarrierId": 1065,
          "Name": "Frontier Airlines"
        }
      ]
    };
    const quotes = (new BrowseQuotes("seattle", "san francisco", "2017-05-14", "2017-05-19")).testing_parseQuoteContents(contents);
    logger.debug(`received ${quotes.length} quotes`);
    expect(quotes.length).to.equal(5);
    const priceList = [647, 754, 647, 754, 345];
    for(let i = 0; i < priceList.length; i++) {
      expect(quotes[i].price).to.equal(priceList[i]);
      // logger.debug(`id: ${q.QuoteId}; price: ${q.MinPrice}; cacheDate: ${q.QuoteDateTime}; departureDate: ${q.OutboundLeg.DepartureDate}; returnDate: ${q.InboundLeg.DepartureDate}`);
    }
  });

  it("testing real quotes", function() {
    const json = JSON.parse(require('fs').readFileSync("/tmp/austin.browsequotes"));
    const quotes = (new BrowseQuotes("seattle", "san francisco", "2017-05-14", "2017-05-19")).testing_parseQuoteContents(json);
    console.log(`received ${quotes.length} quotes`);
    quotes.forEach(q => {
      logger.debug(`${JSON.stringify(q)}`);
    });
  });
});
