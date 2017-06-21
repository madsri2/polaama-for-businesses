'use strict';
const moment = require('moment-timezone');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const fs = require('fs');

// function NextActivityGetter(activityList, testing) {
function NextActivityGetter(trip, date, activityList, testing) {
  if(!trip) throw new Error("NextActivityGetter: required param trip is missing");
  if(!date) throw new Error("NextActivityGetter: required param date is missing");
  if(!activityList) throw new Error("NextActivityGetter: required param activityList is missing");
  this.trip = trip;
  // this is the date of the month (eg. in 6/7/2018, the date is "7")
  this.date = date;
  this.activityList = activityList;
  if(testing) this.testing = true;
  createNextActivityPointerFile.call(this);
  updateNAPFileWithEstimates.call(this);
}

/*
  Expect NAPEstimate file to contain the following structure:
  18: {
    1: "23:30",
    3: "20:00
  },
  19: {
    ...
  }
*/
function updateNAPFileWithEstimates() {
  const file = this.trip.getNAPEstimatesFile();
  if(!fs.existsSync(file)) return;
  const estimates = JSON.parse(fs.readFileSync(file, 'utf8'));
  const nap = this.hourToActivityMap[this.date];
  if(!nap) throw new Error(`updateNAPFileWithEstimates: Expected this.hourToActivityMap to contain an object ${this.date}, but did not find it. Possible BUG!. dump of hourToActivityMap is ${JSON.stringify(this.hourToActivityMap)}`);
  Object.keys(estimates).forEach(date => {
    Object.keys(estimates[date]).forEach(idx => {
      const napKey = `undefined-${idx}`;
      if(!nap[napKey]) throw new Error(`updateNAPFileWithEstimates: key ${napKey} is present in estimate file ${file}, but it's not present in hourToActivityMap. Possible BUG! dump of hourToActivityMap: ${JSON.stringify(this.hourToActivityMap)}; nap dump: ${JSON.stringify(nap)} nap[napKey]: ${nap[napKey]}`);
      nap[napKey].estimate = estimates[date][idx];
    });
  });
}

/*
 Create an object with the following structure:
 "18": {
   'undefined-0': { index: 0, estimate: "08:30" }, // breakfast and relaxing morning
   'undefined-1': { index: 1 }, // Visit ben Gurion's grave
   'undefined-2': { index: 2 }, // Leadership dilemma
   'undefined-3': { index: 3, estimate: "19:00"}, // closing session and dinner
   'undefined-4': { index: 4, estimate: "20:15" }, // Bus departs to Gurion airport
   'undefined-5': { index: 5 }, // Hitboudedut
   '21:00': { index: 6 }, // dinner.
   'undefined-7': { index: 7 }, // overnight stay.
 };
*/
function createNextActivityPointerFile() {
  const file = this.trip.getNAPFile();
  if(fs.existsSync(file)) {
    this.hourToActivityMap = JSON.parse(fs.readFileSync(this.trip.getNAPFile(), 'utf8'));
    // if there is already an object for this date in the nap file, simply return;
    if(this.hourToActivityMap[this.date]) return;
  }
  const nap = {};
  const regex = new RegExp(/^(\d\d:\d\d).*/i);
  // logger.debug(`createNextActivityPointerFile: activity list: ${JSON.stringify(this.activityList)}`);
  this.activityList.forEach((activity,idx) => {
    let contents;
    if(activity.title) contents = regex.exec(activity.title);
    if(!contents && activity.subtitle) contents = regex.exec(activity.subtitle);
    // time not found. Create a key of the form "undefined-<idx>".
    let key;
    if(!contents) key = `undefined-${idx}`;
    else key = contents[1];
    if(!nap[key]) nap[key] = {};
    nap[key].index = idx;
  });
  if(!this.hourToActivityMap) this.hourToActivityMap = {};
  this.hourToActivityMap[this.date] = nap;
  fs.writeFileSync(file, JSON.stringify(this.hourToActivityMap), 'utf8');
}

NextActivityGetter.prototype.getNext = function() {
  // find current time (based on user location) // easy
  setCurrentTime.call(this);
  // find activity corresponding to current time [set currIndex] How?
  return findCurrentActivityIndex.call(this);
}

function findCurrentActivityIndex() {
  const hourToActivityMap = this.hourToActivityMap[this.date];
  const keys = Object.keys(hourToActivityMap);
  logger.debug(`findCurrentActivityIndex: keys: ${keys}`);
  let firstUndefinedTime;
  let potentialIndex;
  for(let i = 0; i < keys.length; i++) {
    const thisTime = keys[i];
    let time = thisTime;
    if(time.startsWith("undefined")) {
      time = hourToActivityMap[thisTime].estimate;
      if(!time) {
        if(!firstUndefinedTime) firstUndefinedTime = thisTime;
        // move on to the next activity since there is nothing to compare now with.
        continue;;
      }
    }
    logger.debug(`findCurrentActivityIndex: Now comparing ${this.now} with ${time};`);
    // thisTime's activity has not happend yet. Return index for the activity. 
    if(compare(this.now, time, "before")) {
      logger.debug(`findCurrentActivityIndex: potentialIndex is ${potentialIndex}; firstUndefinedTime is ${firstUndefinedTime}; thisTime: ${thisTime}; time is ${time}; now is ${this.now}. Returning either potentialIndex or this activities' index`);
      // if the difference is less than 30 minutes, send this activity, else send potential index.
      let index;
      if(diffInMinutes(time, this.now) > 30 && potentialIndex) index = potentialIndex;
      else index = hourToActivityMap[thisTime].index;
      logger.debug(`findCurrentActivityIndex: returning index ${index}; thisTime is ${thisTime}`);
      return index;
    }
    
    // if the times are the same, thisTime's activity is happening as we speak, so send the next activity.
    if(compare(this.now, time, "same")) return hourToActivityMap[thisTime].index + 1;
    if(compare(this.now, time, "after")) {
      // thisTime's activity has happened. 
      // potentialIndex is atleast next activity. but we are not done yet coz. the next activity might also have happened. So, we will keep going.
      potentialIndex = hourToActivityMap[thisTime].index + 1; 
      // reset the firstUndefinedTime so that the next activity will be marked firstUndefinedTime.
      firstUndefinedTime = null;
    }
  }
  logger.debug(`findCurrentActivityIndex: End of activities. potentialIndex is ${potentialIndex}; firstUndefinedTime is ${firstUndefinedTime}. now is ${this.now}.`);
  let index;
  if(potentialIndex) index = potentialIndex;
  if(firstUndefinedTime) index = hourToActivityMap[firstUndefinedTime].index;
  logger.debug(`findCurrentActivityIndex: returning index ${index}`);
  if(index) return index;
  throw new Error(`findCurrentActivityIndex: Neither potentialIndex, nor firstUndefinedTime is defined. We are at the end of the activity list. current time: ${this.now}; activity list dump: ${JSON.stringify(hourToActivityMap)}`);
}

function diffInMinutes(time, currTime) {
  const a = /(\d\d):(\d\d)/.exec(time);
  if(!a) throw new Error(`isBefore: Time ${time} is not in expected format HH:mm`);
  const b = /(\d\d):(\d\d)/.exec(currTime);
  if(!b) throw new Error(`isBefore: currTime ${currTime} is not in expected format HH:mm`);
  const a1 = moment().startOf('day').add(a[1], 'hours').add(a[2], 'minutes');
  const b1 = moment().startOf('day').add(b[1], 'hours').add(b[2], 'minutes');
  const diff = a1.diff(b1, 'minutes');
  logger.debug(`diffInMinutes: difference between ${time} & ${currTime} is ${diff} minutes`);
  return diff;
}

function compare(currTime, time, comparator) {
  const a = /(\d\d):(\d\d)/.exec(currTime);
  if(!a) throw new Error(`isBefore: currTime ${currTime} is not in expected format HH:mm`);
  const b = /(\d\d):(\d\d)/.exec(time);
  if(!b) throw new Error(`isBefore: Time ${time} is not in expected format HH:mm`);
  const a1 = moment().startOf('day').add(a[1], 'hours').add(a[2], 'minutes');
  const b1 = moment().startOf('day').add(b[1], 'hours').add(b[2], 'minutes');
  if(comparator === "before") {
    if(a1.isBefore(b1)) return true;
    else return false;
  }
  if(comparator === "same") {
    if(a1.isSame(b1)) return true;
    else return false;
  }
  if(comparator === "after") {
    if(a1.isAfter(b1)) return true;
    else return false;
  }
  throw new Error(`compare: unknown comparator: Expected one of before, same, after but received: ${comparator}`);
}

NextActivityGetter.prototype.testing_setNow = function(now) {
  this.now = now;
}

function setCurrentTime() {
  if(this.testing) return;
  const tz = "Asia/Tel_Aviv";
  this.now = new moment().tz(tz).format("HH:mm");
  logger.debug(`setCurrentTime: Time now in HH:mm format is ${this.now}`);
}

module.exports = NextActivityGetter;
