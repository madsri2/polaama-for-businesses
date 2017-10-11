'use strict';

const expect = require('chai').expect;
const Promise = require('promise');
const fs = require('fs');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test
const FbidHandler = require('fbid-handler/app/handler');
const PageHandler = require('fbid-handler/app/page-handler');

describe("FbidHandler Tests: ", function() {
  function verifyExpectations(handler, myFbid) {
    expect(handler.getName(myFbid)).to.equal("Madhuvanesh Parthasarathy");
    expect(handler.getName("1326674134041820")).to.equal("Pol Aama");
    const id = handler.encode(myFbid);
    expect(id).to.be.a('string');
    expect(handler.decode(id)).to.equal(myFbid);
  }

  it("add new fbids", function(done) {
    // use this to skip moving file. This way, we don't force a facebook fetch if we want to run the test multiple times.
    const useCache = false;
    if(!useCache) {
      try {
				PageHandler.testing_delete_file();
      }
      catch(e) { 
        logger.error(`Error moving file fbid-test.txt: ${e.stack}`);
      }
    }
    else {
      logger.debug("useCache set to true. Not removing fbid-test.txt file. This means that we will not test getting from facebook");
    }
    const myFbid = "1120615267993271";
    const promises = [];
    const pageHandler = PageHandler.get("fbid-test.txt");
    const promise = pageHandler.add("1280537748676473"); // Adhu Artha
    promise.then(res => { 
      return pageHandler.add("1370147206379852"); // Dhu Rtha
    }, err => {
      logger.error(`error adding first fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return pageHandler.add("1406396006101231"); // Hu Tha
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return pageHandler.add(myFbid); // Madhuvanesh Parthasarathy
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).then(res => {
      logger.debug(`first fbid result: ${res}`);
      return pageHandler.add("1326674134041820"); // Pol Aama
    }, err => {
      logger.error(`error adding second fbid: ${err.stack}`);
      done(err);
    }).done(res => {
      logger.debug(`final result: ${res}`);
      // test that FbidHandler.get reloads from persistent store.
      verifyExpectations(FbidHandler.get("fbid-test.txt"), myFbid);
      done();
    }, err => {
      logger.error(`final error: ${err.stack}`);
      done(err);
    });
  });

  it("test friends list", function() {
    const handler = FbidHandler.get("fbid-test.txt");
    const friends = handler.getFriends("1120615267993271"); // Madhu
    expect(friends.length).to.be.at.least(4);
  });

  it("test encode & decode", function() {
    const polFbid = "1326674134041820";
    const handler = FbidHandler.get("fbid-test.txt");
    const polId = handler.encode(polFbid);
    expect(polId).to.be.a('string');
    expect(handler.decode(polId)).to.equal(polFbid);
  });

  it("test fbid", function() {
    const myFbid = "1120615267993271";
    expect(FbidHandler.get("fbid-test.txt").fbid("Madhuvanesh Parthasarathy")).to.equal(myFbid);
  });

	// TODO: This assumes that the fbids have been added for the default pageId. So, this test is caleld immediately after the above test.
	it("getting same id for user existing with another page", function(done) {
		const pageId = "1852118738377984";
    const pageHandler = PageHandler.get("fbid-test.txt");
    const madhuFbid = "1309200042526761";
    const promise = pageHandler.add(madhuFbid, pageId); 
    promise.done(res => {
      // test that the ids for this page match the ids that already exist
			const defaultFbidHandler = pageHandler.getFbidHandler();
			const myFbidHandler = pageHandler.getFbidHandler(pageId);
      let defaultPageId = defaultFbidHandler.encode(defaultFbidHandler.fbid("Madhuvanesh Parthasarathy"));
			expect(defaultPageId).to.equal(myFbidHandler.encode(madhuFbid));
      done();
    }, err => {
      logger.error(`error adding fbid ${madhuFbid} to page ${pageId}: ${err.stack}`);
      done(err);
    });
	});

  it.skip("Add profile_pic to existing fbids", function(done) {
    const fbids = [
      "1120615267993271", 
      "1280537748676473", 
      "1370147206379852", 
      "1326674134041820", 
      "1420839671315623", 
      "1276733352402531", 
      "1574278789280011", 
      "1359518650798794", 
      "1420209771356315", 
      "1179646898831055", 
      "1718674778147181", 
      "1340543969369556", 
      "1443244455734100", 
      "1019630064806379", 
      "1311237785652279", 
      "1506618749382031", 
      "1630377990366886", 
      "1477835085635211", 
      "1476727692392695", 
      "1428065237278275", 
      "1406396006101231"			
    ];
    PageHandler.testing_delete_file();
		let promises = [];
		const handler = PageHandler.get("fbid-test.txt");
		fbids.forEach(fbid => {
			promises.push(handler.add(fbid));
		});
		Promise.all(promises).done(
			function(status) {
        logger.debug(`added fbids to fbid-test.txt`);
        done();
			},
			function(err) {
        logger.error(`error adding fbid: ${err.stack}`);
        done(err);
      }
		);
  });

  it("adding a page id", function(done) {
    const handler = PageHandler.get("fbid-test.txt");
    const pageId = "1852118738377984";
    handler.add(pageId, pageId).then(
      function(status) {
        expect(handler.getFbidHandler().encode(pageId)).to.be.null;
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("get it for fbid from different page", function() {
    const handler = FbidHandler.get("fbid-test.txt");
    expect(handler.getId("Mad Par")).to.not.be.null;
    expect(handler.fbid("Mad Par")).to.not.be.null;
    expect(handler.getName("1309200042526761")).to.not.be.null;
    expect(handler.decode("nKWM")).to.not.be.null;
    expect(handler.encode("1309200042526761")).to.not.be.null;
  });

});

