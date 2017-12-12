'use strict';
const expect = require('chai').expect;
const SeaSprayHandler = require('sea-spray-handler');
const PageHandler = require('fbid-handler/app/page-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

const handler = new SeaSprayHandler(true /* testing */);
const myFbid = "1234";
function handlePromise(promise, expectedCategory, done, customVerification, last) {
    promise.done(
      function(response) {
        try {
          // logger.debug(`verifying  category: ${expectedCategory}`);
          // logger.debug(JSON.stringify(response));
          expect(response.category).to.equal(expectedCategory);
          expect(response.message).is.not.undefined;
          // logger.debug(JSON.stringify(response.message));
          if(customVerification && typeof customVerification === "function") customVerification(response);
          if(customVerification && typeof customVerification === "boolean") done();
          if(last) done();
          // logger.debug(`session state: ${handler.adminMessageSender.sentMessageToAdmin[myFbid]}`);
        }
        catch(e) {
          logger.error(`handlePromise: Error ${e.stack}`);
          // TODO: Even if we call done(e) here, this test will pass as long as the "done()" above gets called. Fix it.
          done(e);
        }
      },
      function(err) {
        done(err);
      }
    );
}

function verifyState(promise, expectedValue, done) {
  promise.done(
    (value) => {
      try { 
        if(!expectedValue) expect(value).to.be.undefined;
        if(typeof expectedValue === "boolean") expect(value).to.be.true;
        if(typeof expectedValue === "object") expect(value).not.be.undefined;
      }
      catch(e) {
        done(e);
      }
    },
    (err) => {
      done(err);
  });
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

  it("operating hours", function(done) {
    let response = handler.handleText("Are you open now?", PageHandler.mySeaSprayPageId, myFbid);
    const verify = function(response) {
      const message = response.message;
      expect(message.message.attachment.payload.template_type).to.equal("list");
      expect(message.message.attachment.payload.elements[0].title).to.contain("Our office is open");
      expect(message.message.attachment.payload.elements[2].title).to.contain("Our phone numbers");
    };
    handlePromise(response, "operating-hours", done, verify, true);
  });

  it("operating days no tour", function(done) {
    let promise = handler.handleText("what time does the tour operate?", PageHandler.mySeaSprayPageId, myFbid);
    promise.then(
      function(result) {
        expect(result.category).to.equal("operating-days");
        const mesgList = result.message;
        expect(mesgList.length).to.equal(2);
        // logger.debug(JSON.stringify(mesgList));
        expect(mesgList[0].message.text).is.not.undefined;
        return handler.handlePostback("select_tour:sunset_cruise:operating-days", PageHandler.mySeaSprayPageId, myFbid);
      },
      function(err) {
        return Promise.reject(err);
      }
    ).then(
      (message) => {
        expect(message.message.attachment.payload.template_type).to.equal("list");
        expect(message.message.attachment.payload.elements[0].title).to.contain("Sunset Cruise");
        return handler.handleText("when do tours operate?", PageHandler.mySeaSprayPageId, myFbid);
      },
      (err) => {
        return Promise.reject(err);
    }).done(
      function(result) {
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
    let response = handler.handleText("sunset cruise operating days", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("does sunset cruise run year-round", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("When do you operate sunset cruise", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("private charter operating days", function(done) {
    const verifier = function verifier(response) {
      const message = response.message;
      expect(message.message.attachment.payload.elements[0].title).to.contain("Private charters can be customized");
      expect(message.message.attachment.payload.elements[0].buttons[0].title).to.contain("Contact details");
    };
    let response = handler.handleText("When do you operate Private charters?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("tout bagay operating days", function(done) {
    const verifier = function verifier(response) {
      const message = response.message;
      expect(message.message.attachment.payload.elements[0].title).to.contain("Tout Bagay Cruise");
    };
    let response = handler.handleText("tout bagay cruise operating season", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("tout bagay cruise operating days", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("does tout bagay cruise run year-round", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier);
    response = handler.handleText("When are you open for tout bagay tour?", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "operating-days", done, verifier, true);
  });

  it("pirate days operating days", function(done) {
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
    const message = "Nice job..";
    let promise = handler.handleText(message, PageHandler.mySeaSprayPageId, myFbid);
    // ensure that this is not a message that was sent to human being
    const verifier = function(response) {
        verifyState(handler.adminMessageSender.stateManager.get(["messageSentToAdmin", myFbid, message]), undefined, done);
        expect(response.message.message.text).to.include("Thanks! We appreciate your business!");
    }
    handlePromise(promise, "appreciation", done, verifier, true);
  });

  it("test talk to human", function(done) {
    let response = handler.handleText("talk to human", PageHandler.mySeaSprayPageId, myFbid);
    handlePromise(response, "talk-to-human", done, true);
  });

  it("test food options", function(done) {
    let response = handler.handleText("what food options do you have for pirate's day cruise?", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("buffet lunch and drinks on the Pirate's cruise");
    }
    handlePromise(response, "food-options", done, verify);
    response = handler.handleText("what food options do you have for tout bagay cruise?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("buffet lunch and drinks at the Tout Bagay cruise");
    }
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

  it("test details", function(done) {
    let response = handler.handleText("tout bagay details", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Tout Bagay cruise operates from 8.30 a.m. - 5.00 p.m.");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("Local Creole buffet lunch served at Morne Coubaril Estate");
    }
    handlePromise(response, "cruise-details", done, verify);
    response = handler.handleText("What does the pirate's day cruise entail?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Pirate's Day cruise operates from");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("Local Buffet Lunch for Adults,");
    }
    handlePromise(response, "cruise-details", done, verify);
    response = handler.handleText("details of private tours?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      // logger.debug(`response is ${JSON.stringify(response)}`);
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Have a special reason to celebrate? Or just looking to explore the island privately?");
      expect(response.message.message.attachment.payload.elements[2].subtitle).to.contain("Just contact us and we will arrange it for you!");
    }
    handlePromise(response, "cruise-details", done, verify);
    response = handler.handleText("What does the sunset cruise include?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Sunset cruise operates from 5.00 - 7.00 p.m.");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("We serve drinks (like Champagne, Rum punch/mixes) and Hors d’oeuvres");
    }
    handlePromise(response, "cruise-details", done, verify, true);
  });

  it("test details no tour name present", function(done) {
    let promise = handler.handleText("Can you provide details of your tours?", PageHandler.mySeaSprayPageId, myFbid);
    promise.then(
      function(result) {
        expect(result.category).to.equal("cruise-details");
        const mesgList = result.message;
        expect(mesgList.length).to.equal(2);
        expect(mesgList[0].message.text).is.not.undefined;
        return handler.handlePostback("select_tour:sunset_cruise:cruise-details", PageHandler.mySeaSprayPageId, myFbid);
      },
      function(err) {
        return Promise.reject(err);
      }
    ).done(
      (message) => {
        expect(message.message.attachment.payload.template_type).to.equal("list");
        expect(message.message.attachment.payload.elements[0].title).to.contain("Sunset cruise operates from 5.00 - 7.00 p.m.");
        expect(message.message.attachment.payload.elements[3].title).to.contain("We serve drinks (like Champagne, Rum punch/mixes) and Hors d’oeuvres");
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("test cost", function(done) {
    let response = handler.handleText("tout bagay cost", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("generic");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Cost: Adults US $110; Children (2 to 12) US $55");
    }
    handlePromise(response, "cost-of-tour", done, verify);
    response = handler.handleText("What's the cost of the sunset cruise?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("generic");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Adults: US $60; Children (2 to 12): US $30");
    }
    handlePromise(response, "cost-of-tour", done, verify);
    response = handler.handleText("Price of Pirate's day cruise", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("generic");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Cost: Adults US $110; Children (2 to 12) US $50");
    }
    handlePromise(response, "cost-of-tour", done, verify, true);
  });

  it("test cost no tour name present", function(done) {
    let promise = handler.handleText("cost of tour", PageHandler.mySeaSprayPageId, myFbid);
    promise.then(
      function(result) {
        expect(result.category).to.equal("cost-of-tour");
        const mesgList = result.message;
        expect(mesgList.length).to.equal(2);
        expect(mesgList[0].message.text).is.not.undefined;
        return handler.handlePostback("select_tour:tout_bagay:cost-of-tour", PageHandler.mySeaSprayPageId, myFbid);
      },
      function(err) {
        return Promise.reject(err);
      }
    ).done(
      (message) => {
        expect(message.message.attachment.payload.template_type).to.equal("generic");
        expect(message.message.attachment.payload.elements[0].title).to.contain("Cost: Adults US $110; Children (2 to 12) US $55. 10% VAT tax applies");
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("tour start time", function(done) {
    let response = handler.handleText("tout bagay start time", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Tout Bagay cruise operates from 8.30 a.m. - 5.00 p.m.");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("Local Creole buffet lunch served at Morne Coubaril Estate");
    }
    handlePromise(response, "tour-start-time", done, verify);
    response = handler.handleText("When does the Pirate's day cruise start?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Pirate's Day cruise operates from");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("Local Buffet Lunch for Adults,");
    }
    handlePromise(response, "tour-start-time", done, verify, true);
  });

  it("things to do and see", function(done) {
    let response = handler.handleText("what can we see in private tours?", PageHandler.mySeaSprayPageId, myFbid);
    let verify = function(response) {
      // logger.debug(`response is ${JSON.stringify(response)}`);
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Have a special reason to celebrate? Or just looking to explore the island privately?");
      expect(response.message.message.attachment.payload.elements[2].subtitle).to.contain("Just contact us and we will arrange it for you!");
    }
    handlePromise(response, "things-to-do-and-see", done, verify);
    response = handler.handleText("What can we see in the sunset cruise?", PageHandler.mySeaSprayPageId, myFbid);
    verify = function(response) {
      expect(response.message.message.attachment.payload.template_type).to.equal("list");
      expect(response.message.message.attachment.payload.elements[0].title).to.contain("Sunset cruise operates from 5.00 - 7.00 p.m.");
      expect(response.message.message.attachment.payload.elements[3].title).to.contain("We serve drinks (like Champagne, Rum punch/mixes) and Hors d’oeuvres");
    }
    handlePromise(response, "things-to-do-and-see", done, verify, true);
  });
});


describe("sea spray postback", function() {

  function verifyPostbackMessage(promise, tourName, verifier, done, last) {
    promise.then(
      (message) => {
        expect(message.message.attachment.payload.template_type).to.equal("list");
        expect(message.message.attachment.payload.elements[0].title).to.contain(tourName);
        if(verifier) verifier(message);
        logger.debug(`verifyPostbackMessage: true is ${last}`);
        if(last) done();
      },
      (err) => {
        done(err);
    });
  }

  it("book all tours", function(done) {
    const promise = handler.handlePostback("sea_spray_book_tour", PageHandler.mySeaSprayPageId, myFbid);
    promise.done(
      (message) => {
        expect(message.message.attachment.payload.elements.length).to.equal(4);
        expect(message.message.attachment.payload.template_type).to.equal("generic");
        // logger.debug(JSON.stringify(message));
        done();
      },
      (err) => {
        done(err);
    });
  });

  it("customer service postback", function(done) {
    const promise = handler.handlePostback("sea_spray_contact", PageHandler.mySeaSprayPageId, myFbid);
    promise.done(
      (message) => {
      expect(message.message.attachment.payload.elements.length).to.equal(4);
      expect(message.message.attachment.payload.template_type).to.equal("list");
      expect(message.message.attachment.payload.elements[0].title).to.contain("Sea Spray cruises");
      // logger.debug(JSON.stringify(message));
      done();
    },
    (err) => {
      done(err);
    });
  });

  it("admin", function(done) {
    const customerFbid = "432";
    const adminFbid = myFbid;
    const question = "random message to someone";
    const responseToQuestion = "response to message";
    const promise = handler.handleText(question, PageHandler.mySeaSprayPageId, customerFbid);
    promise.then(
      (result) => {
        expect(result.category).to.equal("input.unknown");
        verifyState(handler.adminMessageSender.stateManager.get(["messageSentToAdmin", customerFbid, question]), true, done);
        // logger.debug(JSON.stringify(message));
        return handler.handlePostback(`respond_to_customer_${customerFbid}-_${question}`, PageHandler.mySeaSprayPageId, adminFbid);
      },
      (err) => {
        return Promise.reject(err);
    }).then(
      (message) => {
        verifyState(handler.adminMessageSender.stateManager.get(["awaitingResponseFromAdmin", adminFbid]), {}, done);
        expect(message.recipient.id).to.equal(adminFbid);
        expect(message.message.text).to.include(`Enter your response for customer ${customerFbid}. Question is `); 
        return handler.handleText(responseToQuestion, PageHandler.mySeaSprayPageId, adminFbid);
      },
      (err) => {
        return Promise.reject(err);
    }).done(
      (response) => {
        // logger.debug(`response is ${JSON.stringify(response)}`);
        const mesgList = response.message;
        expect(mesgList[0].recipient.id).to.equal(customerFbid);
        expect(mesgList[0].message.attachment.payload.elements[1].subtitle).to.include(question);
        expect(mesgList[0].message.attachment.payload.elements[1].title.toLowerCase()).to.include(responseToQuestion.toLowerCase());
        expect(mesgList[1].recipient.id).to.equal(adminFbid);
        verifyState(handler.adminMessageSender.stateManager.get(["messageSentToAdmin", customerFbid, question]), undefined, done);
        verifyState(handler.adminMessageSender.stateManager.get(["awaitingResponseFromAdmin",adminFbid]), undefined, done);
        done();
      },
      (err) => {
        return done(err);
    });
  });
});

describe("anthony hackshaw", function() {
  it.skip("real", function(done) {
    message = handler.handleText("what is the biggest boat", PageHandler.mySeaSprayPageId, myFbid);
    message = handler.handleText("what's the cost of the pirate cruise", PageHandler.mySeaSprayPageId, myFbid);
  });
});
