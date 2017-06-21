'use strict';
const expect = require('chai').expect;
const NextActivityGetter = require('calendar-view/app/next-activity-getter');
const DayPlanner = require('calendar-view/app/day-planner');
const fs = require('fs-extra');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
logger.setTestConfig(); // indicate that we are logging for a test
const TripData = require(`${baseDir}/trip-data`);

let trip;
let fbid = "1234";

function cleanup() {
  trip.testing_delete();
}

describe("NextActivityGetter tests: 6/25 itin", function() {
  const dateStr = "2017-6-25";

  before(function() {
    trip = new TripData("test-mobile-view", fbid);  
    const filePrefix = `test-mobile-view-${dateStr}-itinerary.json`;
    fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
    if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
    // create estimates
    const estimate = {
      "25": {
        '0': "08:30",
        '3': "19:00",
        '4': "20:15"
      }
    };
    fs.writeFileSync(trip.getNAPEstimatesFile(),JSON.stringify(estimate), 'utf8');
  });

  after(function() {
    cleanup();
  });

  it("first", function() {
    const date = new Date(dateStr);
    const dayPlanner = new DayPlanner(date, trip, fbid);
    dayPlanner.setActivityList();
    const nag = new NextActivityGetter(trip, date.getDate(), dayPlanner.activityList, true /* testing */);

    // set time to 08:30:
    // const nag = new NextActivityGetter(16, true);
    nag.testing_setNow("08:30");
    expect(nag.getNext()).to.equal(1);

    // 11:00
    nag.testing_setNow("11:00");
    expect(nag.getNext()).to.equal(1);

    // 13:00
    nag.testing_setNow("13:00");
    expect(nag.getNext()).to.equal(1);

    // 19:00
    nag.testing_setNow("19:00");
    expect(nag.getNext()).to.equal(4);

    // 20:15
    nag.testing_setNow("20:15");
    expect(nag.getNext()).to.equal(5);

    // 20:30: estimatedTime for dinner
    nag.testing_setNow("20:30");
    expect(nag.getNext()).to.equal(5);

    // 21:30
    nag.testing_setNow("21:30");
    expect(nag.getNext()).to.equal(5);

    // 23:30
    nag.testing_setNow("23:30");
    expect(nag.getNext()).to.equal(5);
  });
});

describe("NextActivityGetter tests: 6/24 itin", function() {
  before(function() {
    trip = new TripData("test-mobile-view", fbid);  
    let filePrefix = `test-mobile-view-2017-6-24-itinerary.json`;
    fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
    if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
    const estimate = {
      "24": {
        "0": "08:00",
        "2": "13:00",
        "4": "19:30"
      }
    };
    fs.writeFileSync(trip.getNAPEstimatesFile(),JSON.stringify(estimate), 'utf8');
  });

  after(function() {
    cleanup();
  });

  it("first", function() {
    const date = new Date("2017-6-24");
    const dayPlanner = new DayPlanner(date, trip, fbid);
    dayPlanner.setActivityList();
    const nag = new NextActivityGetter(trip, date.getDate(), dayPlanner.activityList, true /* testing */);
    nag.testing_setNow("07:50");
    expect(nag.getNext()).to.equal(0);
  
    // 10:00
    nag.testing_setNow("10:00");
    expect(nag.getNext()).to.equal(1);

    nag.testing_setNow("11:45");
    expect(nag.getNext()).to.equal(1);

    // 12:45
    nag.testing_setNow("12:45");
    expect(nag.getNext()).to.equal(2);

    nag.testing_setNow("13:45");
    expect(nag.getNext()).to.equal(3);
  
    nag.testing_setNow("15:20");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("17:23");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("17:39");
    expect(nag.getNext()).to.equal(3);

    nag.testing_setNow("18:05");
    expect(nag.getNext()).to.equal(3);

    // 19:00
    nag.testing_setNow("19:00");
    expect(nag.getNext()).to.equal(4);
  
    // 20:00
    nag.testing_setNow("20:00");
    expect(nag.getNext()).to.equal(5);
  
    nag.testing_setNow("20:45");
    expect(nag.getNext()).to.equal(6);
  
    // 21:15
    nag.testing_setNow("21:15");
    expect(nag.getNext()).to.equal(7);
  
    // 22:55
    nag.testing_setNow("22:55");
    expect(nag.getNext()).to.equal(7);
  
    // 23:15
    nag.testing_setNow("23:15");
    expect(nag.getNext()).to.equal(7);
  });
});

describe("NextActivityGetter tests: 6/21 itin", function() {
  before(function() {
    trip = new TripData("test-mobile-view", fbid);  
    let filePrefix = `test-mobile-view-2017-6-21-itinerary.json`;
    fs.copySync(`${baseDir}/trips/ZDdz/forTestingPurposes/${filePrefix}`, `${baseDir}/trips/ZDdz/${filePrefix}`);
    if(!fs.existsSync(`${baseDir}/trips/ZDdz/${filePrefix}`)) throw new Error(`file not present`);
    const estimate = {
      "21": {
        "0": "08:00"
      }
    };
    fs.writeFileSync(trip.getNAPEstimatesFile(),JSON.stringify(estimate), 'utf8');
  });

  after(function() {
    cleanup();
  });

  it("first", function() {
    const date = new Date("2017-6-21");
    const dayPlanner = new DayPlanner(date, trip, fbid);
    dayPlanner.setActivityList();
    const nag = new NextActivityGetter(trip, date.getDate(), dayPlanner.activityList, true /* testing */);
    // 07:00
    nag.testing_setNow("07:00");
    expect(nag.getNext()).to.equal(0);
  
    // 09:00
    nag.testing_setNow("09:00");
    expect(nag.getNext()).to.equal(1);
    
    // 12:30
    nag.testing_setNow("12:31");
    expect(nag.getNext()).to.equal(3);
  
    // 13:20
    nag.testing_setNow("13:20");
    expect(nag.getNext()).to.equal(4);
  
    // 15:00
    nag.testing_setNow("15:00");
    expect(nag.getNext()).to.equal(5);
  
    // 17:00
    nag.testing_setNow("17:00");
    expect(nag.getNext()).to.equal(5);
  
    // 18:15
    nag.testing_setNow("18:15");
    expect(nag.getNext()).to.equal(5);
  
    // 19:30
    nag.testing_setNow("19:30");
    expect(nag.getNext()).to.equal(6);
  
    // 20:15
    nag.testing_setNow("20:15");
    expect(nag.getNext()).to.equal(6);
  
    // 20:45
    nag.testing_setNow("20:45");
    expect(nag.getNext()).to.equal(7);
  });
});
