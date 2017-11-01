'use strict';
const expect = require('chai').expect;
const HackshawHandler = require('hackshaw-handler');
const PageHandler = require('fbid-handler/app/page-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe("hackshaw-handler tests", function() {
  const myFbid = "1234";
  const handler = new HackshawHandler();

  it("hi", function() {
    const response = handler.testing_handleText("Hi", HackshawHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(response.message));
    expect(response.category).to.equal("greeting");
  });

  it("book tour", function() {
    const response = handler.testing_handleText("i want to book a tour", HackshawHandler.pageId, myFbid);
    logger.debug(JSON.stringify(response.message));
    expect(response.category).to.equal("book tour");
  });

  it("operating days", function() {
    let response = handler.testing_handleText("private charter operating times", HackshawHandler.pageId, myFbid);
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(`message is ${JSON.stringify(response.message)}`));
    expect(response.category).to.equal("private charter days");
    response = handler.testing_handleText("When does dolphin and whales tour Operate?", HackshawHandler.pageId, myFbid);
    expect(response.message).is.not.undefined;
    expect(response.category).to.equal("dolphin whales days");
    response = handler.testing_handleText("What is the operating days of bottom fishing tour?", HackshawHandler.pageId, myFbid);
    expect(response.message).is.not.undefined;
    expect(response.category).to.equal("bottom fishing days");
    response = handler.testing_handleText("private charter operating times", HackshawHandler.pageId, myFbid);
    expect(response.message).is.not.undefined;
    expect(response.category).to.equal("private charter days");
    response = handler.testing_handleText("When is the Dish and Splash tour?", HackshawHandler.pageId, myFbid);
    expect(response.category).to.equal("dash splash days");
    expect(response.message).is.not.undefined;
    response = handler.testing_handleText("Do you operate Dish Splash tour everyday?", HackshawHandler.pageId, myFbid);
    expect(response.category).to.equal("dash splash days");
    expect(response.message).is.not.undefined;
  });

  it("common questions", function() {
   let response = handler.testing_handleText("contact details", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("customer service");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("Hi, how are you?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("greeting");
   response = handler.testing_handleText("Hi, how are you?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("greeting");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("what is your plan for bad weather", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("bad weather");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("i want to book a tour", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("book tour");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("do you offer discounts for large groups", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("large group discounts");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("do you offer pickup from any hotel", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("hotel transfers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("do I need to book in advance", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("advance booking");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("what's your location", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("location");
   expect(response.message).is.not.undefined;
  });

  it("passenger count", function() {
   let response = handler.testing_handleText("whale watch passenger count", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("whale watch passengers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("dolphin tour capacity", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("whale watch passengers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("how many passengers in the dash and splash tour", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("dash splash passengers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("group sport passenger", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("group sport passengers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("max passengers on a private charter", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("private charter passengers");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("how many people can go on a private charter?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("private charter passengers");
   expect(response.message).is.not.undefined;
  });

  it("human intercept", function() {
   let response = handler.testing_handleText("i want to talk to a human being", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("unclassified");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("human please", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("unclassified");
   response = handler.testing_handleText("Are you a human?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("unclassified");
   response = handler.testing_handleText("a question bots don't understand?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("unclassified");
  });

  it("other questions", function() {
   let response = handler.testing_handleText("can we keep the fish caught during the trip", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("fish catch");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("what do we see during a dolphin whale watching tour", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("dolphin whale types");
   expect(response.message).is.not.undefined;
   response = handler.testing_handleText("how often do we see something during the dolphin whale watching trip?", HackshawHandler.pageId, myFbid);
   expect(response.category).to.equal("dolphin whale success rate");
   expect(response.message).is.not.undefined;
  });
});



