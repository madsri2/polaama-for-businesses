'use strict';
const moment = require('moment-timezone');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

function NextActivityGetter(dayItin, testing) {
  if(testing) this.testing = true;

  this.hourToActivityMapOn17th = {
    'undefined-0': { index: 0, estimate: "08:00" }, // breakfast [if not present, default to 8.00] 
    'undefined-1': { index: 1 }, // Hike Masada: activity 1 is 1.5 hours away. So }, it cannot start until 10.30 at the latest. Hiking masada takes about 2.5 hours.
    'undefined-2': { index: 2, estimate: "13:00" }, // Float at dead sea and lunch: activity 2 is 20 minutes away. So }, activity can start anytime between 11.00
    'undefined-3': { index: 3 }, // Drive south & visit erosion center
    'undefined-4': { index: 4, estimate: "19:30" }, // sunset. estimatedStart 19:30
    'undefined-5': { index: 5 }, // Hitboudedut
    '21:00': { index: 6 }, // dinner.
    'undefined-7': { index: 7 }, // overnight stay.
  };

  this.hourToActivityMapOn16th = {
    "undefined-0": { index: 0 }, // breakfast
    "08:45": { index: 1 }, // Meet Rena Quint
    "11:00": { index: 2 }, // visit yad vashem holocaust
    "14:00": { index: 3 }, // reflection and light lunch
    "17:15": { index: 4 }, // Jon Medved (same place as next activity)
    "undefined-5": { index: 5 }, // Shabbat Candle (15 minutes to next activity location) 
    "undefined-6": { index: 6 }, // Kabbalath Shabat at Western Wall
    "undefined-7": { index: 7, estimate: "20:30" }, // Shabbath dinner [estimatedStart: 21:00]
    "undefined-8": { index: 8 } // overnight stay.
  };

  this.hourToActivityMapOn15th = {
    "undefined-0": { index: 0, estimate: "08:00" }, // breakfast at Merom Golan
    "undefined-1": { index: 1 }, // Gratitude session 
    "undefined-2": { index: 2 }, // Shehecheyanu blessing (Driving to Jerusalem. Takes 2.45 hours to reach Jerusalem). estimatedStart should be atleast after 10.00 assuming early breakfast.
    "13:00": { index: 3 }, // lunch
    "13:30": { index: 4 }, // overview of jerusalem with mayor
    "undefined-5": { index: 5 }, // tour old city
    "18:30": { index: 6 }, // Program with MEET
    "20:30": { index: 7 }, // Culinary tour & dinner
    "undefined-8": { index: 8 }, // overnight stay
  };

  switch(dayItin) {
    case 15:
      this.hourToActivityMap = this.hourToActivityMapOn15th; break;
    case 16:
      this.hourToActivityMap = this.hourToActivityMapOn16th; break;
    case 17:
      this.hourToActivityMap = this.hourToActivityMapOn17th; break;
  }
}

NextActivityGetter.prototype.getNext = function() {
  // find current time (based on user location) // easy
  setCurrentTime.call(this);
  // find activity corresponding to current time [set currIndex] How?
  return findCurrentActivityIndex.call(this);
}

  /*
    prevKey = firstTime;
    For each time in (hourToActivityMap) { // thisTime
      prevKey = thisTime;
      if(thisTime) time = thisTime;
      if(thisTime.estimatedStart) {
        time = thisTime.estimatedStart;
        if(!firstUndefinedTime) firstUndefinedTime = thisTime;
      }

      if(currTime isBefore time) return prevKey.index; 
      
      if(currTime isAfter time) {
        potentialIndex = time.index; // overwrite thisTime as the new potential index
        delete firstUndefinedTime; // we want the next unDefined time after this match to be potential index.
      }
      // no estimatedStart present. Keep going until we find a potential match.
    }
    if(potentialIndex) return potentialIndex; // with warning that this is the estimate.
    if(firstUndefintedTime) return firstUndefinedTime.index; // with warning that this is the closest we could find.
    throw new Error();
  */
function findCurrentActivityIndex() {
  const hourToActivityMap = this.hourToActivityMap;
  const keys = Object.keys(hourToActivityMap);
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
    // logger.debug(`findCurrentActivityIndex: Now comparing ${this.now} with ${time};`);
    // thisTime's activity has not happend yet. Return index for the activity. 
    if(compare(this.now, time, "before")) {
      logger.debug(`findCurrentActivityIndex: potentialIndex is ${potentialIndex}; firstUndefinedTime is ${firstUndefinedTime}; thisTime: ${thisTime}; time is ${time}; now is ${this.now}. Returning either potentialIndex or this activities' index`);
      // if the difference is less than 30 minutes, send this activity, else send potential index.
      let index;
      if(diffInMinutes(time, this.now) > 30 && potentialIndex) index = potentialIndex;
      else index = hourToActivityMap[thisTime].index;
      logger.debug(`findCurrentActivityIndex: returning index ${index}`);
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

function createMaps() {
}

module.exports = NextActivityGetter;
