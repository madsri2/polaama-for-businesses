'use strict';

const expect = require('chai').expect;
const ReadFile = require('../app/read-file');

describe("test1", function() {
  it("read test", function(done) {
    const rf = new ReadFile("/home/ec2-user/trips/india.txt");
    rf.getWeather().done(function(result) {
      console.log(`success: ${JSON.stringify(result)}`);
      done();
    },
    function(err) {
      console.log(`error: ${err}`);
      done(err);
    });
  });
});

/*
    const rf = new ReadFile("/home/ec2-user/trips/india.txt");
    rf.read().then(function(result) {
      console.log(`success: ${result}`);
    },
    function(err) {
      console.log(`error: ${err}`);
    });
*/
