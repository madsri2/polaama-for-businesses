'use strict';
const expect = require('chai').expect;
const TravelSfoHandler = require('travel-sfo-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test

describe("prototype tests", function() {
  const myFbid = "1234";
  
  it("hi", function() {
    const handler = new TravelSfoHandler();
    const message = handler.handleText("operating hours", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });
});

describe("travel-sfo-handler tests", function() {
  const myFbid = "1234";
  
  it("hi", function() {
    const handler = new TravelSfoHandler();
    const message = handler.handleText("Hi", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("lunch", function() {
    const handler = new TravelSfoHandler();
    const message = handler.handleText("lunch served on cruise", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("customer service", function() {
    const handler = new TravelSfoHandler();
    const message = handler.handleText("customer service", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements.length).to.equal(4);
  });

  it("awaiting admin response", function() {
    const handler = new TravelSfoHandler();
    const mesgList = handler.handleText("random message to human", TravelSfoHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(mesgList));
    expect(mesgList.length).to.equal(2);
    const message = mesgList[1];
    expect(message.message.attachment.payload.elements.length).to.equal(2);
    expect(message.message.attachment.payload.buttons.length).to.equal(1);
  });

  it("postback", function() {
    const handler = new TravelSfoHandler();
    const customerFbid = 432;
    const question = "random message to human";
    handler.handleText(question, TravelSfoHandler.pageId, customerFbid);
    expect(handler.sentMessageToAdmin[customerFbid]).to.be.true;
    const message = handler.handlePostback(`respond_to_customer_${customerFbid}`, TravelSfoHandler.pageId, myFbid);
    // logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
    expect(handler.awaitingResponseFromAdmin[customerFbid]).to.be.true;
    const mesgList = handler.handleText("response to message", TravelSfoHandler.pageId, myFbid);
    expect(mesgList[0].message.attachment.payload.elements[1].subtitle).to.include(question);
    logger.debug(JSON.stringify(mesgList));
  });

  it("pmenu customer service", function() {
    const handler = new TravelSfoHandler();
    const customerFbid = 432;
    const message = handler.handlePostback("pmenu_travel_sfo_customer_service", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
  });

  it("pmenu call us", function() {
    const handler = new TravelSfoHandler();
    const customerFbid = 432;
    const message = handler.handlePostback("pmenu_travel_sfo_call_us", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
  });

  it("pmenu cancel hotel", function() {
    const handler = new TravelSfoHandler();
    const customerFbid = 432;
    const message = handler.handlePostback("pmenu_travel_sfo_existing_reservation", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    expect(message.recipient.id).to.equal(myFbid);
    expect(message.message.text).to.not.be.null; 
  });

  it("eco tour", function() {
    const handler = new TravelSfoHandler();
    const mesgList = handler.handleText("eco tour", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(mesgList));
  });

  it("cruise", function() {
    const handler = new TravelSfoHandler();
    const mesgList = handler.handleText("cruise", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(mesgList));
  });

  it("hotels", function() {
    const handler = new TravelSfoHandler();
    const message = handler.handleText("hotels", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    const list = handler.handleText("10/11,2 nights, 2 adults", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(list));
  });

  it("citypass transport", function() {
    const handler = new TravelSfoHandler();
    const mesgList = handler.handleText("citypass transportation", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(mesgList));
  });

  it("cancel hotel", function() {
    const handler = new TravelSfoHandler();
    let message = handler.handleText("cancel hotel", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
    message = handler.handleText("Casa Loma", TravelSfoHandler.pageId, myFbid); 
    logger.debug(JSON.stringify(message));
  });

  it("cancel activities", function() {
    const handler = new TravelSfoHandler();
    let message = handler.handleText("cancel activity", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("like button", function() {
    const handler = new TravelSfoHandler();
    handler.waitingToBookHotel[myFbid] = true;
    let message = handler.handleLikeButton(TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(message));
  });

  it("reviews", function() {
    const handler = new TravelSfoHandler();
    let response = handler.handleText("", TravelSfoHandler.pageId, myFbid, {message: {quick_reply: {payload: "qr_travel_sfo_review_yes"}}});
    logger.debug(JSON.stringify(response));
  });

  it("attractions", function() {
    const handler = new TravelSfoHandler();
    let response = handler.handleText("attractions", TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(response));
    const event = JSON.parse(`{"sender":{"id":"1652003184850840"},"recipient":{"id":"118953662103163"},"timestamp":1505765500307,"message":{"mid":"mid.$cAABsMCtsV-9kx-Ntk1elp4l0sODH","seq":39930,"attachments":[{"title":"Madhuvanesh's Location","url":"https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.bing.com%2Fmaps%2Fdefault.aspx%3Fv%3D2%26pc%3DFACEBK%26mid%3D8100%26where1%3D37.480281%252C%2B-122.151221%26FORM%3DFBKPL1%26mkt%3Den-US&h=ATMG29-IDecy6nhfbgAiiyl5j3VptvbWfPfTF2AxejDr8E63zl8Sab8igShDNaC9US5AtbhUKbAaliA3n76mlQhbGG5-p-xjaUl1O3mCmXIvF5-grQ&s=1&enc=AZOWzEi14ii7RVdOwKAY_YKQxtC15sgW858XhDT_rROkiCpzudfcJnL8Pm84fSHguyKOZH-o1KME6e4Rc_xwJWzF","type":"location","payload":{"coordinates":{"lat":37.480281,"long":-122.151221}}}]}}`);
    const message = event.message;
    response = handler.handleSendingAttractionsNearMe(message, TravelSfoHandler.pageId, myFbid);
    logger.debug(JSON.stringify(response));
  });
});
