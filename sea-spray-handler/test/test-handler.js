'use strict';
const expect = require('chai').expect;
const SeaSprayHandler = require('sea-spray-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe("sea-spray-handler tests", function() {
  const myFbid = "1234";

  it("hi", function() {
    const handler = new SeaSprayHandler();
    const message = handler.handleText("Hi", SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("operating day", function() {
    const handler = new SeaSprayHandler();
    const message = handler.handleText("When are you open for sunset cruise", SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("pirate days operating hours", function() {
    const handler = new SeaSprayHandler();
    const message = handler.handleText("When are you open for sunset cruise", SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("customer service postback", function() {
    const handler = new SeaSprayHandler();
    const message = handler.handlePostback("sea_spray_contact", SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("bad weather", function() {
    const handler = new SeaSprayHandler();
    const message = handler.handlePostback("bad weather", SeaSprayHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });
});
