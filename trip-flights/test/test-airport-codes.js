'use strict';

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();
const AirportCodes = require('trip-flights/app/airport-codes');
const expect = require('chai').expect;

describe("AirportCodes test", function() {
  const airports = new AirportCodes();

  it("get code", function(done) {
    airports.promise.done(
      function(response) {
        console.log(`getCode: There are ${JSON.stringify(response)} lines in the file`);
        expect(airports.getCode("Goroka")).to.equal("gka");
        expect(airports.getCode("Austin")).to.equal("aus");
        done();
      },
      function(err) {
        console.log(`error in airport's promise: ${err.stack}`);
        done(err);
      }
    );
  });

  it("get city", function(done) {
    airports.promise.done(
      function(response) {
        console.log(`getCities: There are ${JSON.stringify(response)} lines in the file`);
        expect(airports.getCity("EWR")).to.equal("newark");
        done();
      },
      function(err) {
        console.log(`error in airport's promise: ${err.stack}`);
        done(err);
      }
    );
  });

});
