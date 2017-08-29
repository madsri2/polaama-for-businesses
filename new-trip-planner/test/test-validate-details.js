'use strict';

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const expect = require('chai').expect;
const Validator = require('new-trip-planner/app/validate-details');

describe("New trip validator tests", function() {
  it("basic test", function() {
    const response = new Validator("vegas,11/1,4").validate();
    expect(response.tripDetails).to.not.be.undefined;
    expect(response.error).to.be.undefined;
    expect(response.tripDetails.destination).to.equal("vegas");
    expect(response.tripDetails.startDate).to.equal("11/1/2017");
    expect(response.tripDetails.duration).to.equal(4);
  });

  it("validate string", function() {
    const response = new Validator("vegas").validateJustDestination();
    expect(response.tripDetails).to.not.be.undefined;
    if(response.error) logger.error(`validate string test: error ${JSON.stringify(response.error)}`);
    expect(response.error).to.be.undefined;
    expect(response.tripDetails.destination).to.equal("vegas");
  });
});
