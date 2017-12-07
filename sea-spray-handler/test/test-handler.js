'use strict';
const expect = require('chai').expect;
const SeaSprayHandler = require('sea-spray-handler');
const PageHandler = require('fbid-handler/app/page-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

const handler = new SeaSprayHandler();
const myFbid = "1234";
function handlePromise(promise, expectedCategory, done, customVerification, last) {
    promise.done(
      function(response) {
        try {
          logger.debug(`verifying  category: ${expectedCategory}`);
          expect(response.category).to.equal(expectedCategory);
          // logger.debug(JSON.stringify(response));
          expect(response.message).is.not.undefined;
          // logger.debug(JSON.stringify(response.message));
          if(customVerification && typeof customVerification === "function") customVerification(response);
          if(customVerification && typeof customVerification === "boolean") done();
          if(last) done();
          logger.debug(`session state: ${handler.adminMessageSender.sentMessageToAdmin[myFbid]}`);
        }
        catch(e) {
          done(e);
        }
      },
      function(err) {
        done(err);
      }
    );
}

describe("sea spray categories", function() {
  it("greeting", function(done) {
    let response = handler.handleText("Hi", PageHandler.mySeaSprayPageId, myFbid);
    const verify = function(response) {
      expect(response.message.length).to.equal(3);
      expect(response.message[0].message.attachment.payload.template_type).to.equal("generic");
    }
    handlePromise(response, "greeting", done, verify);
    // logger.debug(JSON.stringify(response.message));
    response = handler.handleText("Hola", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "greeting", done, verify);
    response = handler.handleText("Hiya", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "greeting", done, verify);
    response = handler.handleText("Howdy", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "greeting", done, verify);
    response = handler.handleText("Hi. How are you?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "greeting", done, verify);
    response = handler.handleText("Hi. How do you do?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "greeting", done, verify, true);
  });

  it("farewell", function(done) {
    let response = handler.handleText("Bye", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done);
    response = handler.handleText("ok. talk to you later", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done);
    response = handler.handleText("ok. talk to you later", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done);
    response = handler.handleText("see you later", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done);
    response = handler.handleText("ok. talk to you later", PageHandler.mySeaSprayPageId, myFbid);
    response = handler.handleText("later", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done);
    response = handler.handleText("ok. talk to you later", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "farewell", done, true);
  });

  it("operating days no tour", function(done) {
    let promise = handler.handleText("what time does the tour operate?", PageHandler.mySeaSprayPageId, myFbid);
    promise.then(
      function(result) {
        expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.true;
        expect(result.category).to.equal("operating-days");
        const mesgList = result.message;
        expect(mesgList.length).to.equal(2);
        // logger.debug(JSON.stringify(mesgList));
        expect(mesgList[0].message.text).is.not.undefined;
        let message = handler.handlePostback("select_tour_sunset_cruise", PageHandler.mySeaSprayPageId, myFbid);
        expect(message.message.attachment.payload.template_type).to.equal("list");
        expect(message.message.attachment.payload.elements[0].title).to.contain("Sunset Cruise");
        expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.false;
        return handler.handleText("when do tours operate?", PageHandler.mySeaSprayPageId, myFbid);
      },
      function(err) {
        done(err);
      }
    ).done(
      function(result) {
        expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.true;
        expect(result.category).to.equal("operating-days");
        const mesgList = result.message;
        expect(mesgList.length).to.equal(2);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("sunset operating days", function(done) {
    const verifier = function verifier(response) {
      const message = response.message;
      expect(message.message.attachment.payload.elements[0].title).to.contain("Sunset Cruise");
    };
    let response = handler.handleText("sunset cruise operating hours", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("does sunset cruise run year-round", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("When are you open for sunset cruise", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("tout bagay days", function(done) {
    const verifier = function verifier(response) {
      const message = response.message;
      expect(message.message.attachment.payload.elements[0].title).to.contain("Tout Bagay Cruise");
    };
    let response = handler.handleText("tout bagay cruise operating season", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("tout bagay cruise operating hours", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("does tout bagay cruise run year-round", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("When are you open for tout bagay tour?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("pirate days operating hours", function(done) {
    const verifier = function verifier(response) {
      const message = response.message;
      expect(message.message.attachment.payload.elements[0].title).to.contain("Pirate Day's Adventure");
    };
    let response = handler.handleText("When are you open for pirate's adventure cruise", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("pirate days adventure cruise operating hours", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("what days does the pirate cruise operate", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("bad weather", function(done) {
    let response = handler.handleText("bad weather", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "bad-weather", done);
    response = handler.handleText("how's the weather", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "bad-weather", done, true);
  });

  it("discounts", function(done) {
    const response = handler.handleText("large group discount", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "large-group-discounts", done, true);
  });

  it("hotel transfers", function(done) {
    let response = handler.handleText("i have a question about hotels", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "hotel-transfers", done);
    response = handler.handleText("which hotel do you transfer from", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "hotel-transfers", done, true);
  });

  it("advance booking", function(done) {
    const response = handler.handleText("do we have to reserve in advance", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "advance-booking", done, true);
  });

  it("passenger count", function(done) {
    let response = handler.handleText("passengers per boat", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "passenger-count", done);
    response = handler.handleText("how many people can go on sunset cruise", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "passenger-count", done);
    response = handler.handleText("maximum passengers in pirate's day", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "passenger-count", done, true);
  });

  it("human", function(done) {
    let response = handler.handleText("want to talk to human", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "talk-to-human", done, true);
  });

  it("customer service", function(done) {
    let response = handler.handleText("contact details", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customer-service", done);
    response = handler.handleText("customer contact details", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customer-service", done);
    response = handler.handleText("customer service", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customer-service", done);
    response = handler.handleText("i want to talk to customer service", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customer-service", done);
    response = handler.handleText("contact customer service", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customer-service", done, true);
  });

  it("input.unknown", function(done) {
    let response = handler.handleText("un understable message", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "input.unknown", done);
    response = handler.handleText("something no one understands", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "input.unknown", done);
    response = handler.handleText("blah blee", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "input.unknown", done, true);
  });

  it("location", function(done) {
    let response = handler.handleText("where are you located", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "location", done);
    response = handler.handleText("are you located in the island", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "location", done, true);
  });

  it("operating season", function(done) {
    let response = handler.handleText("do you operate year round", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-season", done);
    response = handler.handleText("do you close for any season", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-season", done, true);
  });

  it("customized tour", function(done) {
    let response = handler.handleText("Can we customize tours based on our needs", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customized-tour", done);
    response = handler.handleText("Do you offer private tours?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customized-tour", done);
    response = handler.handleText("Can we customize tours?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "customized-tour", done, true);
  });

  it("kids allowed", function(done) {
    let response = handler.handleText("Can we bring kids of any age on the trip?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "kids-allowed", done);
    // expect(response.message.message.attachment.payload.template_type).to.equal('generic');
    response = handler.handleText("Can we bring kids of all ages on the trip?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "kids-allowed", done);
    // expect(response.message.message.attachment.payload.template_type).to.equal('generic');
    response = handler.handleText("Can I bring my 10 year old on the boat", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "kids-allowed", done);
    // expect(response.message.message.attachment.payload.template_type).to.equal('generic');
    response = handler.handleText("Are kids of all ages allowed?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "kids-allowed", done, true);
    // expect(response.message.message.attachment.payload.template_type).to.equal('generic');
  });

  it("operating tours", function(done) {
    let response = handler.handleText("What tours do you operate?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-tours", done);
    response = handler.handleText("tours", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-tours", done);
    response = handler.handleText("supported tours", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-tours", done);
    response = handler.handleText("what tours are available", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-tours", done, true);
  });

  it("infant charges", function(done) {
    let response = handler.handleText("I have a 2 year old. How much should I pay", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "infant-charges", done);
    response = handler.handleText("Do 2 year olds pay", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "infant-charges", done);
    response = handler.handleText("Do two year olds pay", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "infant-charges", done, true);
  });

  it("test appreciation", function(done) {
    let promise = handler.handleText("Nice job..", PageHandler.mySeaSprayPageId, myFbid);
    const verifier = function(response) {
        expect(handler.adminMessageSender.sentMessageToAdmin[myFbid]).to.be.undefined;
    }
    handlePromise(promise, "appreciation", done, verifier, true);
    /*
    promise.done(
      function(response) {
        expect(response.message).to.not.be.undefined;
        expect(response.message.message.text).to.not.be.undefined;
        // logger.debug(`message: ${JSON.stringify(response.message)}`);
        // ensure that this is not a message that was sent to human being
        expect(handler.adminMessageSender.sentMessageToAdmin[myFbid]).to.be.undefined;
        done();
      },
      function(err) {
        done(err);
      }
    );
    */
  });

  it("test talk to human", function(done) {
    let response = handler.handleText("talk to human", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "talk-to-human", done, true);
  });

  it("test food options", function(done) {
    let response = handler.handleText("what food options do you have for pirate's day cruise?", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("buffet lunch and drinks");
    }
    handlePromise(response, "food-options", done, verify);
    response = handler.handleText("what food options do you have for tout bagay cruise?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "food-options", done, verify);
    response = handler.handleText("what food options do you have for private charter?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Buffet lunch can be requested");
    }
    handlePromise(response, "food-options", done, verify);
    response = handler.handleText("what food options do you have for sunset cruise?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("finger food and drinks");
    }
    handlePromise(response, "food-options", done, verify, true);
  });

});

describe("sea spray postback", function() {
  it("test tour selection", function() {
    handler.state[myFbid] = {};
    handler.state[myFbid].awaitingTourNameForOperatingDays = true;
    let message = handler.handlePostback("select_tour_pirate_day", PageHandler.mySeaSprayPageId, myFbid);
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements[0].title).to.contain("Pirate Day's");
    expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.false;
    handler.state[myFbid].awaitingTourNameForOperatingDays = true;
    message = handler.handlePostback("select_tour_sunset_cruise", PageHandler.mySeaSprayPageId, myFbid);
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements[0].title).to.contain("Sunset");
    expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.false;
    handler.state[myFbid].awaitingTourNameForOperatingDays = true;
    message = handler.handlePostback("select_tour_tout_bagay", PageHandler.mySeaSprayPageId, myFbid);
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements[0].title).to.contain("Tout Bagay");
    expect(handler.state[myFbid].awaitingTourNameForOperatingDays).to.be.false;
  });

  it("book all tours", function() {
    const message = handler.handlePostback("sea_spray_book_tour", PageHandler.mySeaSprayPageId, myFbid);
    expect(message.message.attachment.payload.elements.length).to.equal(4);
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    // logger.debug(JSON.stringify(message));
  });

  it("customer service postback", function() {
    const message = handler.handlePostback("sea_spray_contact", PageHandler.mySeaSprayPageId, myFbid);
    expect(message.message.attachment.payload.elements.length).to.equal(4);
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements[0].title).to.contain("Sea Spray cruises");
    // logger.debug(JSON.stringify(message));
  });

  it("admin", function(done) {
    const customerFbid = 432;
    const question = "random message to someone";
    const promise = handler.handleText(question, PageHandler.mySeaSprayPageId, customerFbid);
    promise.then(
      function(result) {
        expect(handler.adminMessageSender.sentMessageToAdmin[customerFbid]).to.be.true;
        expect(result.category).to.equal("input.unknown");
        const message = handler.handlePostback(`respond_to_customer_${customerFbid}`, PageHandler.mySeaSprayPageId, myFbid);
        // logger.debug(JSON.stringify(message));
        expect(message.recipient.id).to.equal(myFbid);
        expect(message.message.text).to.not.be.null; 
        return handler.handleText("response to message", PageHandler.mySeaSprayPageId, myFbid);
      },
      function(err) {
        done(err);
      }
    ).done(
      function(response) {
        const mesgList = response.message;
        expect(mesgList[0].message.attachment.payload.elements[1].subtitle).to.include(question);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });
});

describe("anthony hackshaw", function() {
  it.skip("real", function(done) {
    message = handler.handleText("what is the biggest boat", PageHandler.mySeaSprayPageId, myFbid);
    message = handler.handleText("what's the cost of the pirate cruise", PageHandler.mySeaSprayPageId, myFbid);
  });
});
