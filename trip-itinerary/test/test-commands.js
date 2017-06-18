'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const Promise = require('promise');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const Commands = require('trip-itinerary/app/commands');
const moment = require('moment');
const chai = require('chai');
chai.use(require('chai-string'));


const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig();
const TripData = require(`${baseDir}/trip-data`);

const fbid = "1234";
let trip;

function createNewTrip() {
  trip = new TripData('test-mobile-view', fbid);
}

function cleanup() {
  trip.testing_delete();
}

describe("Commands tests: ", function() {
  let promises;
  let createItin;
  before(function() {
    // set up
    const cityItin = {
      'cities': ['chennai', 'mumbai', 'goa', 'chennai'],
      'numOfDays': ['3', '3', '2', '2']
    };
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const startDate = new moment(twoDaysAgo).format("YYYY-MM-DD");
    const startTime = "09:00";
    const portOfEntry = "chennai";
    createNewTrip();
    trip.data.leavingFrom = "seattle";
    trip.data.country = "india";
    trip.data.startDate = startDate;
    trip.data.startTime = startTime;
    trip.data.name = "test-mobile-view";
    trip.data.portOfEntry = portOfEntry;
    trip.data.cityItin = cityItin;
    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(twoDaysAgo.getDate() + 10);
    trip.data.returnDate = new moment(eightDaysFromNow).format("YYYY-MM-DD");
    trip.data.duration = 10;
    trip.data.departureTime = "22:00";
    const userItin = {};
    let sd = new Date(startDate);
    for(let i = 0; i < trip.data.duration+1; i++) {
      userItin[CreateItinerary.formatDate(sd)] = [`Itinerary for ${sd}`];
      sd.setDate(sd.getDate() + 1);
    }
    fs.writeFile(trip.userInputItinFile(), JSON.stringify(userItin), 'utf8');
    createItin = new CreateItinerary(trip, "seattle");
    promises = createItin.create();
  });

  after(function() {
    cleanup();
  });

  function verifyExpectations(html, city, date) {
    const formattedDate = CreateItinerary.formatDate(date);
    expect(html).to.contain(`${city}: ${formattedDate}`);
    expect(html).to.contain(`Itinerary for ${date}`);
  }

  it("today's itin as html", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate();
        const html = commands.handle("today");
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        verifyExpectations(html, "Chennai", commands.date);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("todays itin as a list", function(done) {
    Promise.all(promises).done(
      function(response) {
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate();
        // set up
        const base = `${baseDir}/trips/ZDdz`;
        const filePrefix = "test-mobile-view-2017-6-13-itinerary.json";
        const targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
        fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
        if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
        const commands = new Commands(trip, fbid);
        const result = commands.handle("today");
        expect(result).to.not.be.null;
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        verifyListViewResponse(result, 4 /* activity count */, true /* button present */, true /* first */);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("tomorrows itin as html", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const html = commands.handle("tomorrow");
        // logger.debug(commands.handle("tomorrow"));
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate() + 1;
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        verifyExpectations(html, "Mumbai", commands.date);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("specific date itin", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate() + 1;
        logger.debug(commands.handle("6/13"));
        /*
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        verifyExpectations(html, "Mumbai", commands.date);
        */
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("month as string", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        logger.debug(commands.handle("June  13"));
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("test list view contents", function(done) {
    Promise.all(promises).done(
      function(response) {
        // set up
        const filePrefix = "test-mobile-view-2017-6-13-itinerary.json";
        fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
        if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
        // actual test
        const commands = new Commands(trip, fbid);
        let result = commands.handle("13th");
        expect(typeof result).to.equal("object");
        expect(result.message.attachment.payload.elements.length).to.equal(4);
        expect(result.message.attachment.payload.elements[0].title).to.include("See your 6/13 itinerary as a map");
        expect(result.message.attachment.payload.elements[1].title).to.include("Carlton Hotel");
        expect(result.message.attachment.payload.elements[3].title).to.include("Lunch");
        expect(result.message.attachment.payload.elements[3].subtitle).to.include("Location N/A");
        expect(result.message.attachment.payload.buttons.length).to.equal(1);
        expect(result.message.attachment.payload.buttons[0].title).to.equal("View more");
        const payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        expect(result.message.attachment.payload.elements.length).to.equal(3);
        expect(result.message.attachment.payload.elements[0].title).to.include("Drive north to Michmoret Beach");
        expect(result.message.attachment.payload.elements[1].title).to.include("Dinner at Michmoret Beach");
        expect(result.message.attachment.payload.elements[2].title).to.include("Overnight at");
        expect(result.message.attachment.payload.top_element_style).to.equals("compact");
        expect(result.message.attachment.payload.buttons).to.be.undefined;
        // logger.debug(JSON.stringify(result));
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  function verifyListViewResponse(result, count, buttonPresent, first) {
    expect(typeof result).to.equal("object");
    expect(result.message.attachment.payload.elements.length).to.equal(count);
    if(!first) expect(result.message.attachment.payload.top_element_style).to.equals("compact");
    if(buttonPresent) {
      expect(result.message.attachment.payload.buttons.length).to.equal(1);
      expect(result.message.attachment.payload.buttons[0].title).to.equal("View more");
    }
    else expect(result.message.attachment.payload.buttons).to.be.undefined;
  }

  it("list format multiple sets", function(done) {
    Promise.all(promises).done(
      function(response) {
        const filePrefix = "test-mobile-view-2017-6-17-itinerary.json";
        // set up
        fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
        if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
        // actual test
        const commands = new Commands(trip, fbid);
        let result = commands.handle("17th");
        verifyListViewResponse(result, 4, true, true /* first */);
        let payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        verifyListViewResponse(result, 3, true);
        payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        verifyListViewResponse(result, 2, false);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("just send date", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const fourDaysFromNow = new Date().getDate() + 4;
        logger.debug(`just send date: ${fourDaysFromNow}`);
        const html = commands.handle(`${fourDaysFromNow}`);
        // logger.debug(commands.handle("tomorrow"));
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(fourDaysFromNow);
        // 4 days from now, we expect to be in Goa
        verifyExpectations(html, "Goa", commands.date);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("return date details", function(done) {
    Promise.all(promises).done(
      function(response) {
        const itinDetails = createItin.getItinerary();
        delete itinDetails.userInputDetails;
        const returnDateStr = CreateItinerary.formatDate(new Date(trip.data.returnDate));
        itinDetails[returnDateStr].weather = [{"min_temp":"72","max_temp":"82","chanceofrain":"0","cloud_cover":"mostly sunny","city":"tel_aviv"}];
        itinDetails[returnDateStr].startTime = "12:45";
        itinDetails[returnDateStr].arrivalTime = "20:45";
        fs.writeFileSync(trip.tripItinFile(), JSON.stringify(itinDetails), 'utf8');
        const commands = new Commands(trip, fbid);
        logger.debug(commands.handle(trip.data.returnDate));
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("date formats", function() {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const commands = new Commands(trip, fbid);
    expect(commands.canHandle("2017-06-11")).to.be.ok;
    expect(CreateItinerary.formatDate(commands.date)).to.equal("6/11/2017");
    expect(commands.canHandle("June 11")).to.be.ok;
    expect(commands.date.getTime()).to.equal(new Date(thisYear, 5, 11).getTime());
    expect(commands.canHandle("Dec 1")).to.be.ok;
    expect(commands.date.getTime()).to.equal(new Date(thisYear, 11, 1).getTime());
    expect(commands.canHandle("10/01")).to.be.ok;
    expect(commands.date.getTime()).to.equal(new Date(thisYear, 9, 1).getTime());
    expect(commands.canHandle("1st")).to.be.ok;
    expect(commands.canHandle("2nd")).to.be.ok;
    expect(commands.canHandle("3rd")).to.be.ok;
    expect(commands.canHandle("4th")).to.be.ok;
    expect(commands.canHandle("10th")).to.be.ok;
    expect(commands.date.getTime()).to.equal(new Date(thisYear, thisMonth, 10).getTime());
    expect(commands.canHandle("10")).to.be.ok;
    expect(commands.date.getTime()).to.equal(new Date(thisYear, thisMonth, 10).getTime());
    expect(commands.canHandle("10sawe")).to.not.be.ok;
  });

  it("weather and flight", function() {
    Promise.all(promises).done(
    function(response) {
      const itinDetails = createItin.getItinerary();
      delete itinDetails.userInputDetails;
      const startDateStr = CreateItinerary.formatDate(new Date(trip.data.startDate));
      itinDetails[startDateStr].weather = [{"min_temp":"72","max_temp":"82","chanceofrain":"0","cloud_cover":"mostly sunny","city":"tel_aviv"}];
      itinDetails[startDateStr].startTime = "12:45";
      itinDetails[startDateStr].arrivalTime = "20:45";
      fs.writeFileSync(trip.tripItinFile(), JSON.stringify(itinDetails), 'utf8');
      const commands = new Commands(trip, fbid);
      logger.debug(commands.handle("6/7"));
    },
    function(err) {
      done(err);
    }
    );
  });
});

describe("Commands tests: Activity tests: ", function() {
  before(function() {
    createNewTrip();
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    const filePrefix = "test-mobile-view-2017-6-13-itinerary.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  beforeEach(function() {
    const indexFile = trip.dayItinIndexFile(new Date("2017-6-13"));
    if(fs.existsSync(indexFile)) fs.unlinkSync(indexFile);
  });

  function verifyFirstActivity(message, day) {
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    const buttons = message.message.attachment.payload.elements[0].buttons;
    expect(buttons.length).to.equal(1);
    expect(buttons[0].title).to.equal("Next");
    const elements = message.message.attachment.payload.elements;
    expect(elements.length).to.equal(1);
    expect(elements[0].title).to.equal("Breakfast at Carlton Hotel");
    if(!day) day = "13";
    expect(elements[0].subtitle).to.startsWith(`\"Activity 1 on ${day}th\": `); 
    expect(elements[0].default_action.url).to.equal("www.carlton.co.il/en");
  }

  it('next relative to now', function() {
    setupFilesForTodayTests(16);
    const commands = new Commands(trip, fbid);
    const message = commands.handleActivity("next");
    logger.debug(`${JSON.stringify(message)}`);
  });

  it("first activity", function() {
    const commands = new Commands(trip, fbid);
    const message = commands.handleActivity("first activity for 6/13");
    verifyFirstActivity(message);
  });

  function verifySecondActivity(message, day) {
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    const buttons = message.message.attachment.payload.elements[0].buttons;
    expect(buttons.length).to.equal(2);
    expect(buttons[0].title).to.equal("Prev");
    expect(buttons[1].title).to.equal("Next");
    const elements = message.message.attachment.payload.elements;
    expect(elements.length).to.equal(1);
    expect(elements[0].title).to.equal("09:30 Program with KamaTech at WIX");
    if(!day) day = "13";
    expect(elements[0].subtitle).to.equal(`\"Activity 2 on ${day}th\": Meet at WIX office`);
    expect(elements[0].default_action.url).to.equal("https://polaama.com/aeXf/tel_aviv/2017-6-13/item-2");
  }

  it("second activity", function() {
    const commands = new Commands(trip, fbid);
    // set up
    const indexFile = trip.dayItinIndexFile(new Date("2017-6-13"));
    fs.writeFileSync(indexFile, "1", 'utf8');
    const message = commands.handleActivityPostback("2017-5-13-next");
  });

  it("multiple postbacks", function() {
    const commands = new Commands(trip, fbid);
    // user types (First Activity)
    let message = commands.handleActivity("first activity for 6/13");
    verifyFirstActivity(message);
    // user clicks (Second Activity)
    message = commands.handleActivityPostback("2017-5-13-0-next");
    verifySecondActivity(message);
    // user clicks (Third Activity)
    message = commands.handleActivityPostback("2017-5-13-1-next");
    logger.debug(`interchange: ${JSON.stringify(message)}`);
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    let buttons = message.message.attachment.payload.elements[0].buttons;
    expect(buttons.length).to.equal(2);
    expect(buttons[0].title).to.equal("Prev");
    expect(buttons[1].title).to.equal("Next");
    let elements = message.message.attachment.payload.elements;
    expect(elements.length).to.equal(1);
    expect(elements[0].title).to.equal("Lunch");
    expect(elements[0].subtitle).to.equal("\"Activity 3 on 13th\": Location N/A");
    // user types (Fourth Activity)
    message = commands.handleActivityPostback("2017-5-13-4-prev");
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    buttons = message.message.attachment.payload.elements[0].buttons;
    expect(buttons.length).to.equal(2);
    expect(buttons[0].title).to.equal("Prev");
    expect(buttons[1].title).to.equal("Next");
    elements = message.message.attachment.payload.elements;
    expect(elements.length).to.equal(1);
    expect(elements[0].title).to.equal("Drive north to Michmoret Beach");
    expect(elements[0].subtitle).to.equal("\"Activity 4 on 13th\": \"Four Styles of Leadership\" exercise and teambuilding on the beach");
  });

  function setupFilesForTodayTests(date) {
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const thisDate = new Date().getDate();
    const base = `${baseDir}/trips/ZDdz`;
    const filePrefix = `test-mobile-view-2017-6-${date}-itinerary.json`;
    const targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
    if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
    return thisDate;
  }

  it("first, next and prev postbacks", function() {
    // set up
    const thisDate = setupFilesForTodayTests(13);
    const commands = new Commands(trip, fbid);
    let message = commands.handleActivity("first");
    verifyFirstActivity(message, thisDate);
    message = commands.handleActivityPostback(`2017-5-${thisDate}-0-next`);
    verifySecondActivity(message, thisDate);
    message = commands.handleActivityPostback(`2017-5-${thisDate}-1-prev`);
    verifyFirstActivity(message, thisDate);
  });

  it("first, next and prev specific date", function() {
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    const filePrefix = "test-mobile-view-2017-6-13-itinerary.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
    const commands = new Commands(trip, fbid);
    let message = commands.handleActivity("first activity for 6/13");
    verifyFirstActivity(message);
    message = commands.handleActivityPostback("2017-5-13-0-next");
    verifySecondActivity(message);
    message = commands.handleActivityPostback("2017-5-13-1-prev");
    verifyFirstActivity(message);
  });

  it("index < 0", function() {
    const commands = new Commands(trip, fbid);
    // set up
    const message = commands.handleActivityPostback("2017-5-13-0-prev");
    logger.debug(JSON.stringify(message));
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.text).to.contain("Already at first activity");
    logger.debug(`${JSON.stringify(message)}`);
  });

  it("index > 0", function() {
    const commands = new Commands(trip, fbid);
    // set up
    const message = commands.handleActivityPostback("2017-5-13-6-next");
    expect(message).to.not.be.null;
    expect(message.recipient.id).to.equal(fbid);
    expect(message.message.text).to.contain("No more activities");
    logger.debug(`${JSON.stringify(message)}`);
  });

  it("date outside window", function() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const startDate = new moment(twoDaysAgo).format("YYYY-MM-DD");
    trip.data.startDate = startDate;
    trip.data.name = "test-mobile-view";
    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(twoDaysAgo.getDate() + 10);
    trip.data.returnDate = new moment(eightDaysFromNow).format("YYYY-MM-DD");

    const commands = new Commands(trip, fbid);
    let message = commands.handleActivity("first on 2nd");
    logger.debug(`${JSON.stringify(message)}`);
    message = commands.handleActivity("first on 29th");
    logger.debug(`${JSON.stringify(message)}`);
  });
});

describe("Commands tests: Meal commands", function() {
  before(function() {
    createNewTrip();
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "test-mobile-view-2017-6-17-itinerary.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
    filePrefix = "test-mobile-view-2017-6-18-itinerary.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("basic tests", function() {
    const commands = new Commands(trip, fbid);
    ["breakfast", "lunch", "dinner"].forEach(meal => {
      expect(commands.canHandleMealsCommand(meal)).to.be.ok;
      expect(commands.canHandleMealsCommand(`${meal} tomorrow`)).to.be.ok;
      expect(commands.canHandleMealsCommand(`${meal} on 18th`)).to.be.ok;
    });
    let message = commands.handleMealsCommand("breakfast");
    logger.debug(`breakfast today: ${JSON.stringify(message)}`);
    message = commands.handleMealsCommand("lunch");
    logger.debug(`lunch today: ${JSON.stringify(message)}`);
    message = commands.handleMealsCommand("dinner");
    logger.debug(`dinner today: ${JSON.stringify(message)}`);
    message = commands.handleMealsCommand("breakfast on 18th");
    logger.debug(`breakfast on 18th: ${JSON.stringify(message)}`);
    message = commands.handleMealsCommand("lunch on 18th");
    logger.debug(`lunch on 18th: ${JSON.stringify(message)}`);
    message = commands.handleMealsCommand("dinner on 18th");
    logger.debug(`dinner on 18th: ${JSON.stringify(message)}`);
  });
});
