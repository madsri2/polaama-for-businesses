'use strict';

const expect = require('chai').expect;
const fs = require('fs');
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

  it("today's itin", function(done) {
    Promise.all(promises).done(
      function(response) {
        const commands = new Commands(trip, "seattle");
        logger.debug(commands.handle("today"));
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
        const commands = new Commands(trip);
        logger.debug(commands.handle("tomorrow"));
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
        const commands = new Commands(trip);
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
        const commands = new Commands(trip);
        logger.debug(commands.handle("June  11"));
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
        const commands = new Commands(trip);
        logger.debug(commands.handle(trip.data.returnDate));
        done();
      },
      function(err) {
        done(err);
      }
    );
  });


  it("date formats", function() {
    const commands = new Commands(trip);
    expect(commands.canHandle("2017-06-11")).to.be.ok;
    expect(commands.canHandle("June 11")).to.be.ok;
    expect(commands.canHandle("Dec 1")).to.be.ok;
    expect(commands.canHandle("10/01")).to.be.ok;
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
      const commands = new Commands(trip);
      logger.debug(commands.handle("6/7"));
    },
    function(err) {
      done(err);
    }
    );
  });
});
