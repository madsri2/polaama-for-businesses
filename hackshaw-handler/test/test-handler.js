'use strict';
const expect = require('chai').expect;
const HackshawPrototypeHandler = require('hackshaw-handler/app/prototype-handler');
const BaseHandler = require('business-pages-handler/app/base-handler');
const PageHandler = require('fbid-handler/app/page-handler');
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test
const Promise = require('promise');

function handlePromises(promises, expectedCategories, customVerifications, done) {
  Promise.all(promises).done(
    (responseArray) => {
      for(let idx = 0; idx < responseArray.length; idx++) {
        const response = responseArray[idx];
        const expectedCategory = expectedCategories[idx];
        const customVerification = (customVerifications) ? customVerifications[idx] : null;
        expect(response.category).to.equal(expectedCategory);
        expect(response.message).is.not.undefined;
        if(customVerification) customVerification(response);
      }
      done();
    },
    (err) => {
      done(err);
    }
  );
}

let handler;
let pageId;
function commonBeforeEach() {
  handler = new BaseHandler(new HackshawPrototypeHandler(true /* testing */));
  pageId = handler.businessPageId;
}

function testQuestionsWithFBTemplateResponse(expectedResponse, category, pageId, fbid) {
  const question = expectedResponse.question;
  const title = expectedResponse.title;
  const secondTitle = expectedResponse.secondTitle;
  const fbTemplateType = expectedResponse.fbTemplateType;
  const subtitle = expectedResponse.subtitle;
  const buttonTitle = expectedResponse.buttonTitle;

  const promise = handler.handleText(question, pageId, fbid);
  const verify = function(response) {
    const message = response.message;
    expect(message.message.attachment.payload.template_type).to.equal(fbTemplateType);
    expect(message.message.attachment.payload.elements[0].title).to.contain(title);
    if(subtitle) expect(message.message.attachment.payload.elements[0].subtitle).to.contain(subtitle);
    if(secondTitle) expect(message.message.attachment.payload.elements[1].title).to.contain(secondTitle);
    if(buttonTitle) expect(message.message.attachment.payload.elements[0].buttons[0].title).to.contain(buttonTitle);
  };
  return {
    promise: promise,
    verify: verify,
    category: category
  };
}

describe("hackshaw-handler tests", function(done) {
  const myFbid = "1234";

  beforeEach(() => {
    commonBeforeEach();
  });

  it("hi", function(done) {
    const promise = handler.handleText("Hi", pageId, myFbid);
    const customVerification = function(response) {
      const messageList = response.message;
      // logger.debug(`messageList is ${JSON.stringify(messageList)}`);
      expect(Array.isArray(messageList)).to.be.true;
      expect(messageList[1].message.text).to.contain("Here is a list of some commonly asked questions");
    }
    handlePromises([promise], ["greeting"], [customVerification], done);
  });

  it("book tour", function(done) {
    const promise = handler.handleText("i want to book a tour", pageId, myFbid);
    const verify = function(response) {
      const message = response.message;
      expect(message.message.attachment.payload.template_type).to.equal("generic");
      expect(message.message.attachment.payload.elements[0].title).to.contain("Bottom Fishing");
      expect(message.message.attachment.payload.elements[2].title).to.contain("Dolphin and Whale watching");
    };
    handlePromises([promise], ["book-tour"], [verify], done);
  });

  it("operating days", function(done) {
    const expectedResponses = {
      "Private charter": {
        question: "private charter operating times",
        secondTitle: "Operates everyday based on availability",
      },
      "Dolphins and Whale": {
        question: "When does dolphin and whales tour Operate?",
        secondTitle: "Operates every Tuesday and Thursday",
      },
      "Bottom Fishing": {
        question: "What is the operating days of bottom fishing tour?",
        secondTitle: "Operates every Thursday at 1 p.m.",
      },
      "Deep Sea Sports Fishing": {
        question: "Group sports fishing days",
        secondTitle: "Operates every Tuesday and Thursday",
      },
      "Dash and Splash": {
        question: "Do you operate Dash Splash tour everyday?",
        secondTitle: "Operates every Monday and Friday",
      }
    };
    const categoryArray = [];
    const promiseArray = [];
    const verifyArray = [];
    Object.keys(expectedResponses).forEach((title, idx, array) => {
      expectedResponses[title].fbTemplateType = "list";
      expectedResponses[title].title = title;
      const r = testQuestionsWithFBTemplateResponse(expectedResponses[title], "operating-days", pageId, myFbid);
      categoryArray.push(r.category);
      promiseArray.push(r.promise);
      verifyArray.push(r.verify);
    });
    handlePromises(promiseArray, categoryArray, verifyArray, done);
  });

  it("common questions", function(done) {
    const expectedResponses = {
      'customer-service': {
        question: "contact details",
        title: "Hackshaw's boats",
        subtitle: "Contact details",
        secondTitle: "Our phone numbers",
        fbTemplateType: "list"
      },
      'bad-weather': {
        question: "what is your plan for bad weather?",
        title: "In case of bad weather, you can reschedule",
        subtitle: "Or cancel at no charge",
      },
      'large-group-discounts': {
        question: "do you offer discounts for large groups",
        title: "Each situation is different, so email or call us",
        subtitle: "We will do our best to meet your requests",
      },
      'hotel-transfers': {
        question: "Do you pick us up from all hotels?",
        title: "We offer transfers for all hotels in the NORTH of the island",
        buttonTitle: "Book tours",
      },
      'advance-booking': {
        question: "do I need to book in advance",
        title: "We recommend booking as early as possible",
        subtitle: "Popular cruises sell out fast. Tours are sold on a first-come first-serve basis",
        buttonTitle: "Book tours",
      },
      'location': {
        question: "What's your location?",
        title: "We are located in the Vigie marina in Castries",
        subtitle: "click to see us on google maps",
      },
      'location': {
        question: "where is hackshaw cruise located",
        title: "We are located in the Vigie marina in Castries",
        subtitle: "click to see us on google maps",
      },
      'location': {
        question: "Where are you located?",
        title: "We are located in the Vigie marina in Castries",
        subtitle: "click to see us on google maps",
      },
      'kids-allowed': {
        question: "Can my 2 year old join me on your boats?",
        title: "Kids of all ages can enjoy our tours",
        subtitle: "Children under 2 travel for free",
        buttonTitle: "Book tours",
      }
    };
    const categoryArray = [];
    const promiseArray = [];
    const verifyArray = [];
    Object.keys(expectedResponses).forEach((category, idx, array) => {
      const expectedResponse = expectedResponses[category];
      if(!expectedResponse.fbTemplateType) expectedResponse.fbTemplateType = "generic";
      const r = testQuestionsWithFBTemplateResponse(expectedResponse, category, pageId, myFbid);
      categoryArray.push(r.category);
      promiseArray.push(r.promise);
      verifyArray.push(r.verify);
    });
    handlePromises(promiseArray, categoryArray, verifyArray, done);
  });

  it("passenger count", function(done) {
    const expectedResponses = {
      "Private Charter": {
        question: "how many people can go on a private charter?",
        title: "The actual number varies depending on the type of boat requested",
      },
      "Dolphin and Whale": {
        question: "whale watch passenger count",
        title: "On average, we have 40 passengers on a trip",
        subtitle: "The actual number varies depending on the time of year",
      },
      "Group sports fishing": {
        question: "group sport passenger",
        title: "On average, we have 7 to 9 passengers on a boat",
        subtitle: "The actual number varies depending on the size of boat used",
      },
      "Bottom fishing": {
        question: "max passengers on bottom fishing",
        title: "The actual number varies depending on the size of boat used",
      },
      "Dash and splash": {
        question: "how many passengers in the dash and splash tour",
        title: "Speed boats have a capacity of 20 passengers",
      },
    };
    const categoryArray = [];
    const promiseArray = [];
    const verifyArray = [];
    Object.keys(expectedResponses).forEach((key) => {
      const expectedResponse = expectedResponses[key];
      expectedResponse.fbTemplateType = "generic";
      const r = testQuestionsWithFBTemplateResponse(expectedResponse, "passenger-count", pageId, myFbid);
      categoryArray.push(r.category);
      promiseArray.push(r.promise);
      verifyArray.push(r.verify);
    });
    handlePromises(promiseArray, categoryArray, verifyArray, done);
  });

  it("human intercept", function(done) {
    let promises = [
      handler.handleText("i want to talk to a human being", pageId, myFbid),
      handler.handleText("human please", pageId, myFbid),
      handler.handleText("Are you a human?", pageId, myFbid),
      handler.handleText("a question bots don't understand?", pageId, myFbid)
    ]; 
    let categories = [
      "talk-to-human",
      "talk-to-human",
      "talk-to-human",
      "talk-to-human",
    ];
    const verifications = [null, null, null, null];
    handlePromises(promises, categories, verifications, done);
  });

  it("other questions", function(done) {
    const expectedResponses = {
      "fish-catch": {
        question: "can we keep the fish caught during the trip",
        title: "All fish are the property of the boat",
        subtitle: "BUT we will gladly share the fish with guests",
      },
      "dolphin-whale-types": {
        question: "what do we see during a dolphin whale watching tour",
        title: "We have resident pods of Sperm whales (with calves) and Pilot whales",
        subtitle: "We also have many different species of Dolphins",
      },
      "dolphin-whale-success-rate": {
        question: "how often do we see something during the dolphin whale watching trip?",
        title: "We give an 85% chance of Dolphin & Whale sightings",
        buttonTitle: "Book trip",
      },
    };
    const categoryArray = [];
    const promiseArray = [];
    const verifyArray = [];
    Object.keys(expectedResponses).forEach((category, idx, array) => {
      const expectedResponse = expectedResponses[category];
      expectedResponse.fbTemplateType = "generic";
      const r = testQuestionsWithFBTemplateResponse(expectedResponse, category, pageId, myFbid);
      categoryArray.push(r.category);
      promiseArray.push(r.promise);
      verifyArray.push(r.verify);
    });
    handlePromises(promiseArray, categoryArray, verifyArray, done);
  });

  it.skip("Bottom fishing bonanza", () => {});

  it.skip("infant charges, cash onboard, what kinds of payments do you accept, lunch details, disabled friendly, operating season, operating tours, pets, ", () => {});

  it.skip("cruise details including cost",() => {});

  it.skip("Tour starting time", () => {});

});


