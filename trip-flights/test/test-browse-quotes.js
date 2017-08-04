'use strict';

const moment = require('moment');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();

const fs = require('fs');
const expect = require('chai').expect;
const BrowseQuotes = require('trip-flights/app/browse-quotes');
const Promise = require('promise');

const cachedFile = "/home/ec2-user/flights/SFOtoAUSon2017-08-01-cached.txt";

describe("Browse Quotes tests", function() {
  it("testing cached quotes", function(done) {
    // delete file to force a skyscaner uri call
    if(fs.existsSync(cachedFile)) fs.unlinkSync(cachedFile);
    this.timeout(5000); // mocha's timeout
    const startDate = moment().add(7, 'days').format("YYYY-MM-DD");
    const returnDate = moment().add(14, 'days').format("YYYY-MM-DD");
    const promise = (new BrowseQuotes("san francisco", "austin", startDate, returnDate)).getCachedQuotes();
    promise.done(
      function(result) { 
        logger.debug(`Result from browse quotes: ${result}`); 
        expect(result).to.be.ok;
        expect(fs.existsSync(cachedFile)).to.be.true;
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  // simply verify that you are able to read from the file created in test above and return contents in the expected format
  it("get stored quotes", function(done) {
    const promise = new BrowseQuotes("san francisco", "austin", "2017-08-01", "2017-08-08").getStoredQuotes();
    promise.done(
      function(contents) {
        const quotes = contents;
        console.log(`received ${quotes.length} quotes`);
        expect(quotes.length).to.be.above(0);
        expect(quotes.departureDate).to.be.a('string');
        expect(quotes.returnDate).to.be.a('string');
        for(let i = 0; i < quotes.length; i++) {
          logger.debug(`${JSON.stringify(quotes[i])}`);
          expect(quotes[i].price).to.be.above(0);
          expect(quotes[i].id).to.be.above(0);
          expect(quotes[i].originCarrier).to.be.instanceOf(Array);
          expect(quotes[i].originCarrier.length).to.be.above(0);
          expect(quotes[i].returnCarrier).to.be.instanceOf(Array);
          expect(quotes[i].returnCarrier.length).to.be.above(0);
          expect(quotes[i].originDirect).to.be.a('boolean');
          expect(quotes[i].returnDirect).to.be.a('boolean');
        }
        done();
      },
      function(err) {
        logger.error(`testing err: ${err}`);
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
    const priceList = [345, 647, 754];
    expect(quotes.length).to.equal(priceList.length);
    for(let i = 0; i < priceList.length; i++) {
      expect(quotes[i].price).to.equal(priceList[i]);
      // logger.debug(`id: ${q.QuoteId}; price: ${q.MinPrice}; cacheDate: ${q.QuoteDateTime}; departureDate: ${q.OutboundLeg.DepartureDate}; returnDate: ${q.InboundLeg.DepartureDate}`);
    }
  });


  it("testing real quotes", function() {
    const json = JSON.parse(fs.readFileSync(`${baseDir}/trip-flights/austin.browsequotes`));
    const quotes = new BrowseQuotes("san francisco", "austin", "2017-05-14", "2017-05-19").testing_parseQuoteContents(json);
    console.log(`received ${quotes.length} quotes`);
    const priceList = [425, 500, 521];
    expect(quotes.length).to.equal(priceList.length);
    for(let i = 0; i < priceList.length; i++) {
      expect(quotes[i].price).to.equal(priceList[i]);
    }
  });

  it("resolve duplicates", function() {
    const quotes = [{
      id: "1",
      price: 345,
      originCarrier: ["Virgin America"],
      returnCarrier: ["Virgin America"]
    },
    {
      id: "2",
      price: 345,
      originCarrier: ["Virgin America"],
      returnCarrier: ["Virgin America"]
    },
    {
      id: "3",
      price: 369,
      originCarrier: ["Alaska"],
      returnCarrier: ["Alaska"],
    },
    {
      id: "4",
      price: 420,
      originCarrier: ["A", "B"],
      returnCarrier: ["A", "B"]
    },
    {
      id: "5",
      price: 420,
      originCarrier: ["A", "B"],
      returnCarrier: ["A", "B"]
    },
    {
      id: "6",
      price: 500,
      originCarrier: ["A", "B", "C"],
      returnCarrier: ["A", "B", "D"]
    }];
    const startDate = "2017-05-14";
    const returnDate = "2017-05-19";
    quotes.departureDate = startDate;
    quotes.returnDate = returnDate;
    let expectedQuotes = [];
    expectedQuotes = expectedQuotes.concat(quotes.slice(0,1)).concat(quotes.slice(2,4)).concat(quotes.slice(5,6));
    expectedQuotes.departureDate = startDate;
    expectedQuotes.returnDate = returnDate;
    logger.debug(`expected quotes is ${JSON.stringify(expectedQuotes)}`);
    const actualQuotes = new BrowseQuotes("san francisco", "austin", startDate, returnDate).testing_resolveDuplicates(quotes);
    expect(actualQuotes).to.deep.equal(expectedQuotes);
  });

  it("increase quote count", function() { 
    let json = JSON.parse(fs.readFileSync(`${baseDir}/trip-flights/austin.browsequotes`));
    let quotes = new BrowseQuotes("san francisco", "austin", "2017-05-14", "2017-05-19").testing_parseQuoteContents(json);
    logger.debug(`quotes: ${JSON.stringify(quotes)}`);
    json = JSON.parse(fs.readFileSync(`${baseDir}/trip-flights/austin.browsedates`));
    quotes = new BrowseQuotes("san francisco", "austin", "2017-05-14", "2017-05-19").testing_parseQuoteContents(json);
    logger.debug(`dates: ${JSON.stringify(quotes)}`);
    json = JSON.parse(fs.readFileSync(`${baseDir}/trip-flights/austin.browseroutes`));
    quotes = new BrowseQuotes("san francisco", "austin", "2017-05-14", "2017-05-19").testing_parseQuoteContents(json);
    logger.debug(`routes: ${JSON.stringify(quotes)}`);
  });
});

