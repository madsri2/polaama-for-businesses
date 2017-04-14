'use strict';

const expect = require('chai').expect;
const FbidHandler = require('fbid-handler/app/handler');
const Promise = require('promise');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe("FbidHandler Tests: ", function() {
  function verifyExpectations(handler, myFbid) {
    expect(handler.getName(myFbid)).to.equal("Madhuvanesh Parthasarathy");
    expect(handler.encode(myFbid)).to.be.a('string');
    // adding the same fbid second time will simply fetch it from cache, forcing a null return
    expect(handler.add(myFbid)).to.be.null; 
    expect(handler.getName(myFbid)).to.equal("Madhuvanesh Parthasarathy");
  }
  it("add new fbids", function(done) {
    // use this to skip moving file. This way, we don't force a facebook fetch if we want to run the test multiple times.
    const useCache = true;
    if(!useCache) {
      try {
        // remove this file to force fetch from facebook graph.
        const oldFile = `${baseDir}/fbid-handler/fbid-test.txt`; 
        const newFile = `${baseDir}/fbid-handler/fbid-test.txt.orig`; 
        require('fs').renameSync(oldFile, newFile);
      }
      catch(e) { 
        if(e.code != 'ENOENT') logger.error(`Error moving file fbid-test.txt: ${e.stack}`);
      }
    }
    else {
      logger.debug("useCache set to true. Not removing fbid-test.txt file. This means that we will not test getting from facebook");
    }
    const myFbid = "1120615267993271";
    const promises = [];
    const handler = new FbidHandler("fbid-test.txt");
    const promise = handler.add("1280537748676473"); // Adhu Artha
    if(!promise) {
      // this means that Adhu Artha is already there, which means we are using the cache (see useCache above). Simply perform the checks and move on.
      verifyExpectations(handler, myFbid);
      done();
      return;
    }
    promise.then(res => { 
      logger.debug(`first fbid result: ${res}`);
      return handler.add("1370147206379852"); // Dhu Rtha
    }, err => {
      logger.error(`error adding first fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return handler.add("1406396006101231"); // Hu Tha
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return handler.add(myFbid); // Madhuvanesh Parthasarathy
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return handler.add("1326674134041820"); // Pol Aama
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).done(res => {
      logger.debug(`final result: ${res}`);
      verifyExpectations(handler, myFbid);
      done();
    }, err => {
      logger.error(`final error: ${err.stack}`);
      done(err);
    });
  });

  it("test friends list", function() {
    const handler = new FbidHandler("fbid-test.txt");
    const friends = handler.getFriends("1120615267993271"); // Madhu
    expect(friends.length).to.be.at.least(4);
  });

  it("test encode & decode", function() {
    const polFbid = "1326674134041820";
    const handler = new FbidHandler("fbid-test.txt");
    const polId = handler.encode(polFbid);
    expect(polId).to.be.a('string');
    expect(handler.decode(polId)).to.equal(polFbid);
  });

  it("test fbid", function() {
    const myFbid = "1120615267993271";
    expect(new FbidHandler("fbid-test.txt").fbid("Madhuvanesh Parthasarathy")).to.equal(myFbid);
  });
});

