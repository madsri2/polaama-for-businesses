'use strict';
const EventKeywordPlanner = require('calendar-view/app/event-keyword-handler');
const expect = require('chai').expect;
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();

describe("test event keyword handler", function() {
  it("keyword match", function() {
    const dp = new EventKeywordPlanner("1234");
    const eventName = "test-phocuswright";
    let message = dp.handleKeywords(eventName, "chris hemmiter");
    logger.debug(`test: ${JSON.stringify(message)}`);
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = dp.handleKeywords(eventName, "nathan bobbin");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = dp.handleKeywords(eventName, "mike coletta");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = dp.handleKeywords(eventName, "amir amidi");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(1);
  });
});
