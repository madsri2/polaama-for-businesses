'use strict';

const expect = require('chai').expect;
const fs = require('fs-extra');
const Promise = require('promise');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const Commands = require('trip-itinerary/app/commands');
const moment = require('moment');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const TripData = require(`${baseDir}/trip-data`);

describe("Commands tests: ", function() {
  let promises;
  const fbid = "1234";
  let trip;
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
    trip = new TripData('test-mobile-view', fbid);
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
    trip.testing_delete();
  });

  function verifyExpectations(html, city, date) {
    const formattedDate = CreateItinerary.formatDate(date);
    expect(html).to.contain(`${city}: ${formattedDate}`);
    expect(html).to.contain(`Itinerary for ${date}`);
  }

  it("today's itin", function(done) {
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

  it("today as a list", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate();
        const itinAsList = commands.getTodaysItinAsList("today", fbid);
        expect(itinAsList).to.not.be.null;
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        logger.debug(`${JSON.stringify(itinAsList)}`);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("today next set", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, fbid);
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const thisDate = new Date().getDate();
        const itinNextSet = commands.getTodaysItinNextSet(fbid);
        expect(itinNextSet).to.not.be.null;
        expect(commands.date.getMonth()).to.equal(thisMonth);
        expect(commands.date.getFullYear()).to.equal(thisYear);
        expect(commands.date.getDate()).to.equal(thisDate);
        logger.debug(`${JSON.stringify(itinNextSet)}`);
        done();
      },
      function(err) {
        done(err);
      }
    );
  });

  it("tomorrow's itin", function(done) {
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
        logger.debug(commands.handle("6/13"));
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

  it("list or html", function(done) {
    Promise.all(promises).done(
      function(response) {
        // set up
        fs.copySync("/home/ec2-user/trips/aeXf/tel_aviv-2017-6-13-itinerary.json", "/home/ec2-user/trips/ZDdz/test-mobile-view-2017-6-13-itinerary.json");
        if(!fs.existsSync("/home/ec2-user/trips/ZDdz/test-mobile-view-2017-6-13-itinerary.json")) throw new Error(`file not present`);
        // actual test
        const commands = new Commands(trip, fbid);
        let result = commands.handle("13th");
        expect(typeof result).to.equal("object");
        expect(result.message.attachment.payload.elements.length).to.equal(4);
        expect(result.message.attachment.payload.elements[0].title).to.include("Carlton Hotel");
        expect(result.message.attachment.payload.elements[3].title).to.include("Drive north");
        expect(result.message.attachment.payload.buttons.length).to.equal(1);
        expect(result.message.attachment.payload.buttons[0].title).to.equal("View more");
        const postback = result.message.attachment.payload.buttons[0].payload;
        result = commands.handlePostback(postback);
        expect(result.message.attachment.payload.elements.length).to.equal(2);
        expect(result.message.attachment.payload.elements[0].title).to.include("Dinner at Michmoret Beach");
        expect(result.message.attachment.payload.elements[1].title).to.include("Overnight at");
        logger.debug(JSON.stringify(result));
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
