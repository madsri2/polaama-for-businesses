'use strict';
const expect = require('chai').expect;
const SeaSprayHandler = require('sea-spray-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

const handler = new SeaSprayHandler();
const myFbid = "1234";

describe("sea-spray-handler tests", function() {

  it("hi", function() {
    const response = handler.testing_handleText("Hi", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(response.message));
    expect(response.category).to.equal("greeting");
    expect(response.message).is.not.undefined;
  });

  it("operating day", function() {
    const response = handler.testing_handleText("When are you open for sunset cruise", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
    expect(response.category).to.equal("sunset cruise days");
    expect(response.message).is.not.undefined;
  });

  it("pirate days operating hours", function() {
    const response = handler.testing_handleText("When are you open for pirate's adventure cruise", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
    expect(response.category).to.equal("pirate days");
    expect(response.message).is.not.undefined;
  });


  it("bad weather", function() {
    const response = handler.testing_handleText("bad weather", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
    expect(response.category).to.equal("bad weather");
    expect(response.message).is.not.undefined;
  });


  it("discounts", function() {
    const response = handler.testing_handleText("large group discount", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("large group discounts");
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(message));
  });

  it("hotel transfers", function() {
    const response = handler.testing_handleText("which hotel do you transfer from", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("hotel transfers");
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(message));
  });

  it("advance booking", function() {
    const response = handler.testing_handleText("do we have to reserve in advance", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("advance booking");
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(message));
  });

  it("passenger count", function() {
    let response = handler.testing_handleText("passengers per boat", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("passenger count");
    expect(response.message).is.not.undefined;
    response = handler.testing_handleText("how many people can go on sunset cruise", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("passenger count");
    expect(response.message).is.not.undefined;
    response = handler.testing_handleText("maximum passengers in pirate's day", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("passenger count");
    expect(response.message).is.not.undefined;
  });

  it("human", function() {
    let response = handler.testing_handleText("i have a question about hotels", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("unclassified");
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(message));
  });

  it("customer service", function() {
    let response = handler.testing_handleText("contact details", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("customer service");
    expect(response.message).is.not.undefined;
    // logger.debug(JSON.stringify(response.message));
  });

  it("unclassified", function() {
    let response = handler.testing_handleText("i want to talk to a human", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("unclassified");
    response = handler.testing_handleText("human", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("unclassified");
    response = handler.testing_handleText("i don't want to talk to a bot", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("unclassified");
    response = handler.testing_handleText("i have a question about hotels", SeaSprayHandler.pageId, myFbid);
    expect(response.category).to.equal("unclassified");
  });

  it("location", function() {
    let response = handler.testing_handleText("where are you located", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
    expect(response.category).to.equal("location");
  });
});

describe("sea spray postback", function() {
  it("book all tours", function() {
    const message = handler.handlePostback("sea_spray_book_tour", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
  });

  it("customer service postback", function() {
    const message = handler.handlePostback("sea_spray_contact", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
  });

  it("admin", function() {
    const customerFbid = 432;
    const question = "random message to human";
    handler.handleText(question, SeaSprayHandler.pageId, customerFbid);
    // expect(handler.sentMessageToAdmin[customerFbid]).to.be.true;
    const message = handler.handlePostback(`respond_to_customer_${customerFbid}`, SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
    const mesgList = handler.handleText("response to message", SeaSprayHandler.pageId, myFbid);
    expect(mesgList[0].message.attachment.payload.elements[1].subtitle).to.include(question);
    logger.debug(JSON.stringify(mesgList));
  });
  it("admin", function() {
    const customerFbid = 432;
    const question = "random message to human";
    handler.handleText(question, SeaSprayHandler.pageId, customerFbid);
    // expect(handler.sentMessageToAdmin[customerFbid]).to.be.true;
    const message = handler.handlePostback(`respond_to_customer_${customerFbid}`, SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
    const mesgList = handler.handleText("response to message", SeaSprayHandler.pageId, myFbid);
    expect(mesgList[0].message.attachment.payload.elements[1].subtitle).to.include(question);
    logger.debug(JSON.stringify(mesgList));
  });
});

describe("anthony hackshaw", function() {
  it("real", function() {
    let message = handler.handleText("what tours are available", SeaSprayHandler.pageId, myFbid);
    message = handler.handleText("how's the weather", SeaSprayHandler.pageId, myFbid);
    message = handler.handleText("what is the biggest boat", SeaSprayHandler.pageId, myFbid);
    message = handler.handleText("what's the cost of the pirate cruise", SeaSprayHandler.pageId, myFbid);
    message = handler.handleText("what time is the tour", SeaSprayHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(response.message));
  });
});
