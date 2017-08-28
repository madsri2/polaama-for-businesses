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
  trip.addTripDetailsAndPersist({
    ownerId: "ZDdz"
  });
}

function cleanup() {
  trip.testing_delete();
}

describe("Commands tests: Basic tests", function() {
  let promises;
  let createItin;

  before(function() {
    // set up
    const cityItin = {
      'cities': ['chennai', 'mumbai', 'goa', 'chennai'],
      'numOfDays': ['3', '3', '2', '2']
    };
    // start date is two days ago.
    const startDate = new moment().tz('US/Pacific').subtract(2,'days').format("YYYY-MM-DD");
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
    // return date is 8 days from today.
    trip.data.returnDate = new moment(startDate).add(10, 'days').format("YYYY-MM-DD");
    trip.data.duration = 10;
    trip.data.departureTime = "22:00";
    const userItin = {};
    let sd = new moment(startDate);
    for(let i = 0; i < trip.data.duration+1; i++) {
      const date = new Date(sd.format("YYYY-MM-DD"));
      userItin[sd.format('M/D/YYYY')] = [`Itinerary for ${date}`];
      sd.add(1, 'days');
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

  it("todays itin as html", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        commands.testing = true;
        const date = moment().tz("US/Pacific");
        const html = commands.handle("today");
        expect(commands.date.getMonth()).to.equal(date.month());
        expect(commands.date.getFullYear()).to.equal(date.year());
        expect(commands.date.getDate()).to.equal(date.date());
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
        const date = moment().tz("US/Pacific");
        const thisMonth = date.month();
        const thisYear = date.year();
        const thisDate = date.date();
        // set up
        const base = `${baseDir}/trips/ZDdz`;
        const filePrefix = "test-mobile-view-2017-6-13-itinerary.json";
        const targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
        fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
        if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
        const commands = new Commands(trip, fbid);
        commands.testing = true;
        const result = commands.handle("today");
        expect(result).to.not.be.null;
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        logger.debug(`${JSON.stringify(result)}`);
        verifyListViewResponse(result, 4 /* activity count */, true /* button present */, true /* first */);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("invalid date outside the start and return date range", function(done) {
    Promise.all(promises).done(
      function(response) {
        const date = moment().tz("US/Pacific");
        const thisMonth = date.month();
        const thisYear = date.year();
        const thisDate = date.date();
        // actual test
        const origStartDate = trip.data.startDate;
        const origReturnDate = trip.data.returnDate;
        trip.data.startDate = "2017-9-10";
        trip.data.returnDate = "2017-9-16";
        const commands = new Commands(trip, fbid);
        commands.testing = true;
        let result = commands.handle("9th");
        expect(result).to.not.be.null;
        logger.debug(`${JSON.stringify(result)}`);
        expect(result.message.text).to.include("is not a valid date for ");
        result = commands.handle("today");
        expect(result).to.not.be.null;
        logger.debug(`${JSON.stringify(result)}`);
        expect(result.message.text).to.include("is not a valid date for ");
        result = commands.handle("tomorrow");
        expect(result).to.not.be.null;
        logger.debug(`${JSON.stringify(result)}`);
        expect(result.message.text).to.include("is not a valid date for ");

        trip.data.startDate = origStartDate;
        trip.data.returnDate = origReturnDate;
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
        commands.testing = true;
        const html = commands.handle("tomorrow");
        // logger.debug(commands.handle("tomorrow"));
        const date = moment().tz("US/Pacific");
        const thisMonth = date.month();
        const thisYear = date.year();
        const thisDate = date.date() + 1;
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
        const origStartDate = trip.data.startDate;
        const origReturnDate = trip.data.returnDate;
        trip.data.startDate = "2017-6-10";
        trip.data.returnDate = "2017-6-16";
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
        logger.debug(`test list view contents: payload ${payload}`);
        result = commands.handlePostback(payload);
        expect(result.message.attachment.payload.elements.length).to.equal(3);
        expect(result.message.attachment.payload.elements[0].title).to.include("Drive north to Michmoret Beach");
        expect(result.message.attachment.payload.elements[1].title).to.include("Dinner at Michmoret Beach");
        expect(result.message.attachment.payload.elements[2].title).to.include("Overnight at");
        expect(result.message.attachment.payload.top_element_style).to.equals("compact");
        expect(result.message.attachment.payload.buttons).to.be.undefined;
        // logger.debug(JSON.stringify(result));
        trip.data.startDate = origStartDate;
        trip.data.returnDate =  origReturnDate; 
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("test compact style for second set", function(done) {
    Promise.all(promises).done(
      function(response) {
        // set up
        const filePrefix = "test-mobile-view-single-element-second-set.json";
        const targetFile = "test-mobile-view-2017-6-13-itinerary.json";
        fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${targetFile}`);
        if(!fs.existsSync(`${baseDir}/trips/ZDdz/${targetFile}`)) throw new Error(`file not present`);
        // actual test
        const origStartDate = trip.data.startDate;
        const origReturnDate = trip.data.returnDate;
        trip.data.startDate = "2017-6-10";
        trip.data.returnDate = "2017-6-16";
        const commands = new Commands(trip, fbid);
        let result = commands.handle("13th");
        expect(typeof result).to.equal("object");
        expect(result.message.attachment.payload.top_element_style).to.not.equals("compact");
        expect(result.message.attachment.payload.elements.length).to.equal(4);
        expect(result.message.attachment.payload.buttons.length).to.equal(1);
        expect(result.message.attachment.payload.buttons[0].title).to.equal("View more");
        const payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        logger.debug(`test compact style: ${JSON.stringify(result)}`);
        expect(result.message.attachment.payload.elements.length).to.equal(1);
        expect(result.message.attachment.payload.template_type).to.equal("generic");
        expect(result.message.attachment.payload.buttons).to.be.undefined;
        trip.data.startDate = origStartDate;
        trip.data.returnDate =  origReturnDate; 
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
        const filePrefix = "test-mobile-view-2017-6-16-itinerary.json";
        // set up
        fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
        if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
        // actual test
        const origStartDate = trip.data.startDate;
        const origReturnDate = trip.data.returnDate;
        const localTrip = trip;
        localTrip.data.startDate = "2017-6-12";
        localTrip.data.returnDate = "2017-6-19";
        const commands = new Commands(localTrip, fbid);
        let result = commands.handle("16th");
        verifyListViewResponse(result, 4, true, true /* first */);
        let payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        verifyListViewResponse(result, 4, true);
        payload = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(payload);
        verifyListViewResponse(result, 2, false);
        trip.data.startDate = origStartDate;
        trip.data.returnDate = origReturnDate;
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
        logger.debug(`just send date: ${fourDaysFromNow}; trip start date: ${trip.data.startDate}; return date: ${trip.data.returnDate}`);
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
    const thisMonth = "5"; // index for month, not the actual month.
    const thisYear = "2017"; 
    const commands = new Commands(trip, fbid);
    const origStartDate = trip.data.startDate;
    const origReturnDate = trip.data.returnDate;
    trip.data.startDate = "2017-6-1";
    trip.data.returnDate = "2017-6-12";
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
    trip.data.startDate = origStartDate;
    trip.data.returnDate = origReturnDate;
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
    const dayMoment = new moment().date(day).format("Do");
    expect(elements[0].subtitle).to.startsWith(`\"Activity 1 on ${dayMoment}\":`); 
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
    const dayMoment = new moment().date(day).format("Do");
    expect(elements[0].subtitle).to.equal(`\"Activity 2 on ${dayMoment}\": Meet at WIX office`);
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
    const dateMoment = moment().tz("US/Pacific");
    const thisMonth = dateMoment.month();
    const thisYear = dateMoment.year();
    let thisDate = dateMoment.date();
    const base = `${baseDir}/trips/ZDdz`;
    const filePrefix = `test-mobile-view-2017-6-${date}-itinerary.json`;
    const targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
    if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
    logger.debug(`setupFilesForTodayTests: target file is ${targetFile}; month: ${thisMonth}`);
    return thisDate;
  }

  it("first, next and prev postbacks", function() {
    // set up
    const thisDate = setupFilesForTodayTests(13);
    const commands = new Commands(trip, fbid);
    let message = commands.handleActivity("first");
    verifyFirstActivity(message, thisDate);
    const month = moment().tz("US/Pacific").month();
    const year = moment().tz("US/Pacific").year();
    message = commands.handleActivityPostback(`${year}-${month}-${thisDate}-0-next`);
    verifySecondActivity(message, thisDate);
    message = commands.handleActivityPostback(`${year}-${month}-${thisDate}-1-prev`);
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
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const threeDaysAgoMoment = new moment(threeDaysAgo).format("Do");
    let result = commands.handleActivity(`first on ${threeDaysAgoMoment}`)
    expect(result).to.not.be.null;
    expect(result.message.text).to.include("is not a valid date for ");
    // logger.debug(`${JSON.stringify(message)}`);
    const twelveDaysFromNow = new Date();
    twelveDaysFromNow.setDate(twelveDaysFromNow.getDate() + 12);
    const twelveDaysFromNowMoment = new moment(twelveDaysFromNow).format("Do");
    result = commands.handleActivity(`first on ${twelveDaysFromNowMoment}`);
    expect(result).to.not.be.null;
    expect(result.message.text).to.include("is not a valid date for ");
  });
});


describe("Commands tests: Next Activity", function() {
  before(function() {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const startDate = new moment(twoDaysAgo).format("YYYY-MM-DD");
    createNewTrip();
    trip.data.startDate = startDate;
    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(twoDaysAgo.getDate() + 10);
    trip.data.returnDate = new moment(eightDaysFromNow).format("YYYY-MM-DD");
    trip.data.duration = 10;
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "test-mobile-view-2017-6-22-itinerary.json";
    const date = moment().tz("GMT");
    const thisMonth = date.month();
    const thisYear = date.year();
    const thisDate = date.date();
    const targetPrefix = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetPrefix}`);
    if(!fs.existsSync(`${base}/${targetPrefix}`)) throw new Error(`file ${targetPrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("next", function() {
    const commands = new Commands(trip, fbid);
    const message = commands.handleActivity("next");
    // An error message would result in message.text. Otherwise, it would be a generic template of a list template (an object)
    expect(message.message.text).to.be.undefined;
    logger.debug(`${JSON.stringify(message)}`);
  });
});

// TODO: Make this relative. this won't scale.
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
    filePrefix = "test-mobile-view-2017-6-19-itinerary.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  function setupFilesForTestingToday() {
    const date = moment().tz("US/Pacific");
    const thisMonth = date.month();
    const thisYear = date.year();
    let thisDate = date.date();
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    const filePrefix = "test-mobile-view-2017-6-17-itinerary.json";
    let targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
    if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
    date.add(1, "day");
    thisDate = date.date();
    targetFile = `test-mobile-view-${thisYear}-${thisMonth + 1}-${thisDate}-itinerary.json`;
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${targetFile}`);
    if(!fs.existsSync(`${base}/${targetFile}`)) throw new Error(`file ${targetFile} not present`);
  }

  it("basic tests", function() {
    const commands = new Commands(trip, fbid);
    const origStartDate = trip.data.startDate;
    const origReturnDate = trip.data.returnDate;
    trip.data.startDate = "2017-6-15";
    trip.data.returnDate = "2017-6-19";
    setupFilesForTestingToday();
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
    trip.data.startDate =  origStartDate;
    trip.data.returnDate = origReturnDate;
  });
});

describe("Commands tests: Running trail tests", function() {
  before(function() {
    createNewTrip();
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "test-mobile-view-running-trails.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("basic test", function() {
    const commands = new Commands(trip, fbid);
    expect(commands.canHandleActivity("running")).to.be.ok;
    let message = commands.handleActivity("running");
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements.length).to.equal(3);
    expect(message.message.attachment.payload.elements[0].subtitle).to.equal("Near your hotel");
    logger.debug(`basic test: ${JSON.stringify(message)}`);
    message = commands.handleRecommendationPostback(`1-recommendation_next_set`);
    expect(message.message.attachment.payload.top_element_style).to.equal("compact");
    expect(message.message.attachment.payload.elements.length).to.equal(2);
    expect(message.message.attachment.payload.elements[0].subtitle).to.equal("2.2 miles from hotel");
    logger.debug(`second set ${JSON.stringify(message)}`);
  });
});

describe("Commands tests: Vegetarian restaurant tests", function() {
  before(function() {
    createNewTrip();
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "test-mobile-view-vegetarian-restaurants.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("basic test", function() {
    const commands = new Commands(trip, fbid);
    expect(commands.canHandleActivity("veg options")).to.be.ok;
    let message = commands.handleActivity("veg options");
    expect(message.message.attachment.payload.template_type).to.equal("list");
    expect(message.message.attachment.payload.elements.length).to.equal(3);
    expect(message.message.attachment.payload.elements[0].title).to.equal("Vegetarian restaurants near you");
    logger.debug(`basic test: ${JSON.stringify(message)}`);
  });
});

describe("Commands tests: Trip dates", function() {
  before(function() {
    createNewTrip();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const startDate = new moment(twoDaysAgo).format("YYYY-MM-DD");
    trip.data.startDate = startDate;
    trip.data.name = "test-mobile-view";
    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(twoDaysAgo.getDate() + 10);
    trip.data.returnDate = new moment(eightDaysFromNow).format("YYYY-MM-DD");
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "test-mobile-view-trip-image.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("basic test", function() {
    const commands = new Commands(trip, fbid);
    expect(commands.canHandle("dates")).to.be.ok;
    let message = commands.handle("dates");
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    expect(message.message.attachment.payload.elements[0].title).to.equal(`Trip to ${trip.data.rawName}`);
    logger.debug(`basic test: ${JSON.stringify(message)}`);
  });

  it("image not present", function() {
    // remove the image file.
    const imageFile = `${baseDir}/trips/ZDdz/test-mobile-view-trip-image.json`;
    fs.unlinkSync(imageFile);
    if(fs.existsSync(imageFile)) throw new Error(`file ${imageFile} present even after deleting it`);
    const commands = new Commands(trip, fbid);
    expect(commands.canHandle("dates")).to.be.ok;
    let message = commands.handle("dates");
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    expect(message.message.attachment.payload.elements[0].title).to.equal(`Trip to ${trip.data.rawName}`);
    logger.debug(`basic test: ${JSON.stringify(message)}`);
  });
});

describe("Commands tests: Hotel choices", function() {
  before(function() {
    createNewTrip();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const startDate = new moment(twoDaysAgo).format("YYYY-MM-DD");
    trip.data.startDate = startDate;
    trip.data.name = "test-mobile-view";
    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(twoDaysAgo.getDate() + 10);
    trip.data.returnDate = new moment(eightDaysFromNow).format("YYYY-MM-DD");
    // set up
    const base = `${baseDir}/trips/ZDdz`;
    let filePrefix = "city-hotel-choices.json";
    fs.copySync(`${base}/forTestingPurposes/${filePrefix}`, `${base}/${filePrefix}`);
    if(!fs.existsSync(`${base}/${filePrefix}`)) throw new Error(`file ${filePrefix} not present`);
  });

  after(function() {
    cleanup();
  });

  it("basic test", function() {
    const commands = new Commands(trip, fbid);
    expect(commands.canHandle("city hotel choices")).to.be.ok;
    let message = commands.handle("city hotel choices");
    expect(message.message.attachment.payload.template_type).to.equal("generic");
    expect(message.message.attachment.payload.elements.length).to.equal(3);
    expect(message.message.attachment.payload.elements[0].title).to.equal("Hotel1 Name");
  });

});

describe("Event tests", function() {
  beforeEach(function() {
    createNewTrip();
  });

  afterEach(function() {
    cleanup();
  });

  it("test next set for event details", function() {
    trip.addEvent("test-arival");
    const commands = new Commands(trip, fbid);
    let message = commands.handleRecommendationPostback("test-arival:theater-1-recommendation_next_set");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(4);
    message = commands.handleRecommendationPostback("test-arival:workshops-2-recommendation_next_set");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(3);
    // logger.debug(`message: ${JSON.stringify(message)}`);
  });

  it("get event details", function() {
    trip.addEvent("test-phocuswright");
    const commands = new Commands(trip, fbid);
    let message = commands.handleEventCommands("test-phocuswright");
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = commands.getEventItinerary(["pb_event_details_day","test-phocuswright","sep_12"]);
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(4);
    message = commands.handleRecommendationPostback("test-phocuswright:sep_12-1-recommendation_next_set");
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(4);
  });

  it("multiple events", function() {
    trip.addEvent("test-arival");
    trip.addEvent("phocuswright");
    const commands = new Commands(trip, fbid);
    let message = commands.handleEventCommands("conf details");
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    expect(message.message.attachment.payload.elements[0].buttons.length).to.equal(2);
    message = commands.handleEventCommands("battleground");
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = commands.getEventItinerary(["pb_event_details","phocuswright"]);
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(1);
  });

  it("event keywords", function() {
    trip.addEvent("test-arival");
    trip.addEvent("phocuswright");
    const commands = new Commands(trip, fbid);
    let message = commands.handleEventCommands("battleground");
    expect(message).to.not.be.null;
    expect(message.message.attachment.payload.elements.length).to.equal(1);
    message = commands.handleEventCommands("mike");
    expect(message).to.not.be.null;
    logger.debug(JSON.stringify(message));
    expect(message.message.attachment.payload.elements.length).to.equal(1);
  });
});
