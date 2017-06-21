'use strict';

const moment = require('moment-timezone');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const DayPlanner = require('calendar-view/app/day-planner');
const htmlBaseDir = "/home/ec2-user/html-templates"; // TODO: Move this to config.
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

// TODO: fbid is not needed as trip object contains an fbid. Use that instead and remove the use of fbid everywhere.
function Commands(trip, fbid, sendHtml) {
  if(!fbid) throw new Error(`Commands: required parameter fbid not passed`);
  if(!trip) throw new Error(`Commands: required parameter trip not passed`);
  this.fbid = fbid;
  this.trip = trip;
  this.sendHtml = sendHtml;
  // we will always start with the first element set when a command is initialized (see DayPlanner.getPlanAsList)
  this.setNum = 0;
}

Commands.prototype.handle = function(command) {
  this.command = command;
  return handleDayItin.call(this);
}

Commands.prototype.handleActivity = function(command) {
  this.command = command;
  return handleActivityCommand.call(this);
}

Commands.prototype.canHandle = function(command) {
  this.command = command;
  // return false here so that it will be picked up by canHandleActivity below.
  if(this.command.startsWith("first") || this.command.startsWith("next")) return false; 
  if(this.command.startsWith("tomorrow")) return true;
  if(this.command.startsWith("today")) return true;
  return setDateIfValid.call(this);
}

Commands.prototype.canHandleActivity = function(command) {
  this.command = command;
  if(this.command.startsWith("first activity ") || (this.command.startsWith("first for ") || this.command === "first") || (this.command.startsWith("first on "))) return true;
  if(this.command === "next") return true; // support getting activity relative to current time
  return false;
}

Commands.prototype.canHandleMealsCommand = function(command) {
  this.command = command;
  if(this.command.startsWith("breakfast on ") || this.command === "breakfast tomorrow" || this.command === "breakfast") return true;
  if(this.command.startsWith("lunch on ") || this.command === "lunch tomorrow" || this.command === "lunch") return true;
  if(this.command.startsWith("dinner on ") || this.command === "dinner tomorrow" || this.command === "dinner") return true;

  return false;
}

Commands.prototype.handleMealsCommand = function(command) {
  this.command = command;
  let contents = /(breakfast|lunch|dinner)\s*(?:on)?\s*(.*)/.exec(this.command);
  if(!contents) return null;
  if(contents[1] !== "breakfast" && contents[1] !== "lunch" && contents[1] !== "dinner") return null;
  let val;
  if(contents[2] == '') val = "today"; else val = contents[2];
  if(!setDateIfValid.call(this, val)) return null;
  logger.debug(`handleMealsCommand: parsed date <${CreateItinerary.formatDate(this.date)}> from <${val}> and command <${this.command}>`);
  const dateStr = CreateItinerary.formatDate(this.date);
  const dayPlanner = new DayPlanner(this.date, this.trip, this.fbid); 
  dayPlanner.setActivityList();
  return dayPlanner.getMealElement(contents[1]);
}

Commands.prototype.handleActivityPostback = function(payload) {
  const content = DayPlanner.parseActivityPostback(payload);
  if(!content) return null;
  this.date = content.date;
  this.command = null;
  // logger.debug(`handleActivityPostback: date is ${this.date}; ${CreateItinerary.formatDate(this.date)}`);
  const dayPlanner = new DayPlanner(this.date, this.trip, this.fbid);
  dayPlanner.setActivityList();
  if(content.dir === "next") return dayPlanner.getNextActivity(content.idx + 1);
  if(content.dir === "prev") return dayPlanner.getPrevActivity(content.idx - 1);
  logger.error(`handleActivityPostback: unknown direction <${content.dir}>`);
  return null;
}

function handleActivityCommand() {
  // parse
  let contents = /(first|next)\s*(?:activity)?\s*(?:for|on)?\s*(.*)/.exec(this.command);
  if(!contents) return null;
  if(contents[1] !== "first" && contents[1] !== "next") return null;
  let val;
  if(contents[2] == '') val = "today"; else val = contents[2];
  if(!setDateIfValid.call(this, val)) return null;
  logger.debug(`handleActivityCommand: parsed date <${this.date}> from <${val}> and command <${this.command}>`);
  const dateStr = CreateItinerary.formatDate(this.date);
  const dayPlanner = new DayPlanner(this.date, this.trip, this.fbid); 
  if(!isValidDate.call(this)) {
    const errMessage = {
        recipient: {
          id: this.fbid
        },
        message: {
          text: `${CreateItinerary.formatDate(this.date)} is not a valid date for your ${this.trip.data.rawName} trip`,
          metadata: "DEVELOPER_DEFINED_METADATA"
        }
    };
    return errMessage;
  }
  dayPlanner.setActivityList();
  if(contents[1] === "first") return dayPlanner.getNextActivity(0);
  if(contents[1] === "next") return dayPlanner.getNextActivityRelativeToTime();
  return null;
}

// set this trips year and month, accounting for the cases where month & year of start and return dates need not be the same.
function setTripMonthAndYear(date) {
  const sdMoment = new moment(new Date(this.trip.data.startDate));
  const rdMoment = new moment(new Date(this.trip.data.returnDate));
  const sdYear = sdMoment.year();
  const rdYear = rdMoment.year();
  const sdMonth = sdMoment.month();
  const rdMonth = rdMoment.month();

  const dateInSdMonth = new moment(new Date(sdYear,sdMonth,date));
  if(dateInSdMonth.isBetween(sdMoment, rdMoment) || dateInSdMonth.isSame(sdMoment)) {
    this.tripYear = sdYear;
    this.tripMonth = sdMonth;
    logger.debug(`setTripMonthAndYear: Set month of the trip to ${this.tripMonth} and year to ${this.tripYear}`);
    return;
  }
  const dateInRdMonth = new moment(new Date(rdYear,rdMonth,date));
  if(dateInRdMonth.isBetween(sdMoment, rdMoment) || dateInRdMonth.isSame(rdMoment)) {
    this.tripYear = rdYear;
    this.tripMonth = rdMonth;
    logger.debug(`setTripMonthAndYear: Set month of the trip to ${this.tripMonth} and year to ${this.tripYear}`);
    return;
  }

  logger.warn(`setTripMonthAndYear: date ${date} did not fall between start date ${this.trip.data.startDate} and return date ${this.trip.data.returnDate}. Not setting tripMonth and tripYear.`);
}

function isValidDate() {
  const dateMoment = new moment(this.date);
  if(!this.trip.data.startDate || this.trip.data.startDate ==="unknown" || !this.trip.data.returnDate || this.trip.data.returnDate === "unknown") {
    logger.warn("return date is null or unknown. cannot validate if date ${this.date} is part of the trip or not. returning true. if it's not a valid date, there won't be a corresponding day plan, so it's ok to assume it is valid here");
    return true;
  }

  const sdMoment = new moment(this.trip.data.startDate);
  const rdMoment = new moment(this.trip.data.returnDate);

  if(!dateMoment.isBetween(sdMoment, rdMoment) || !dateMoment.isSame(sdMoment) || !dateMoment.isSame(rdMoment)) {
    logger.warn(`isValidDate: ${this.date} is not between ${this.trip.data.startDate} & ${this.trip.data.returnDate}`);
    return false;
  }

  logger.debug(`isValidDate: ${this.date} is valid. It is in inbetween start & return dates. startDate: ${this.trip.data.startDate}; returnDate: ${this.trip.data.returnDate}`);
  setTripMonthAndYear.call(this, dateMoment.date());
  return true;
}

Commands.prototype.getPath = function(command) {
  if(this.command.startsWith("tomorrow")) return "tomorrow";
  if(this.command.startsWith("today")) return "today";
  if(!this.date && !setDateIfValid.call(this)) throw new Error(`getPath: invalid command ${command}`);
  return new moment(this.date).format("YYYY-MM-DD");
}

Commands.prototype.handlePostback = function(payload) {
  // logger.debug(`handlePostback: date is ${date}; ${CreateItinerary.formatDate(date)}`);
  const parsedPayload = DayPlanner.parseDayItinPostback(payload); 
  if(!parsedPayload) return null;
  if(!listFormatAvailable(parsedPayload.date)) return null;
  this.date = parsedPayload.date;
  this.setNum = parseInt(parsedPayload.number);
  return getDayItinerary.call(this);
}

function listFormatAvailable(date) {
  return true;
  /*
  const dateList = ["6/12/2017", "6/13/2017", "6/14/2017", "6/15/2017", "6/16/2017", "6/17/2017", "6/18/2017","6/19/2017","6/20/2017","6/21/2017","6/22/2017","6/23/2017","6/24/2017","6/25/2017","6/26/2017"];
  const dateStr = CreateItinerary.formatDate(date);
  if(dateList.indexOf(dateStr) != -1) {
    // logger.debug(`listFormatAvailable: ${dateStr} is present in dateList. Returning true.`);  
    return true;
  }
  // logger.debug(`listFormatAvailable: ${dateStr} is NOT present in dateList. Returning false.`);  
  return false;
  */
}

function handleDayItin() {
  if(!setDateIfValid.call(this)) return null;
  return getDayItinerary.call(this);
}

function setDateIfValid(passedCommand) {
  let command = passedCommand;
  if(!command) command = this.command;

  if(command.startsWith("tomorrow")) {
    const tomorrow = new Date(moment().tz(getTimezone.call(this)).format("M/DD/YYYY"));
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.date = tomorrow;
    logger.debug(`setDateIfValid: set date to be tomorrow (${this.date})`);
    return true;
  }
  if(command.startsWith("today")) {
    this.date = new Date(moment().tz(getTimezone.call(this)).format("M/DD/YYYY"));
    logger.debug(`setDateIfValid: set date to be today (${this.date})`);
    return true;
  }
  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  let contents = /^(\d+)(.*)$/.exec(command);
  if(contents && (contents[2] === " " || contents[2] === '' || contents[2] === "th" || contents[2] === "rd" || contents[2] === "st" || contents[2] === "nd")) {
      // user just provided the date, without specifying month & year. Infer the month & year based on this trip's start & return dates.
      setTripMonthAndYear.call(this, contents[1]);
      if(!Array.isArray(this.tripMonth) && !Array.isArray(this.tripYear)) {
        this.date = new Date(this.tripYear, this.tripMonth, contents[1]);
        logger.debug(`setDateIfValid: Matched [date]. contents: [${contents}] set date to be (${this.date})`);
        return true;
      }
      // the month or year spans multiple years. Get the appropriate month.
    }
  contents = /^([a-zA-Z]+) *(\d+)/.exec(command);
  if(contents) {
    this.date = new Date(thisYear, toNum(contents[1]), contents[2]);    
    logger.debug(`setDateIfValid: Matched [MON date]. contents: [${contents}] set date to be today (${this.date})`);
    return true;
  }
  contents = /(\d+)\/(\d+)/.exec(command);
  if(contents) {
    this.date = new Date(thisYear, contents[1]-1, contents[2]);    
    logger.debug(`setDateIfValid: Matched [dd/mm]. contents: [${contents}] set date to be (${this.date})`);
    return true;
  }
  contents = /(\d+)-(\d+)-(\d+)/.exec(command);
  if(contents) {
    this.date = new Date(command);
    logger.debug(`setDateIfValid: Matched [YYYY-MM-DD]. contents: [${contents}] set date to be today (${this.date})`);
    return true;
  }
  logger.error(`setDateIfValid: unknown format ${command} that did not match any of the known formats.`);
  return false;
}

function getDayItinerary() {
  const dayPlanner = new DayPlanner(this.date, this.trip, this.fbid); 
  const dateStr = CreateItinerary.formatDate(this.date);
  if(!this.sendHtml && listFormatAvailable(this.date)) {
    logger.debug(`getDayItinerary: Sending list view format for date ${dateStr}`);
    const dayAsList = dayPlanner.getPlanAsList(this.setNum);
    // logger.debug(`getDayItinerary: dayAsList dump: ${JSON.stringify(dayAsList)}`);
    if(dayAsList) return dayAsList;
  }
  logger.debug(`getDayItinerary: Sending html for date ${dateStr}`);
  const itin = new CreateItinerary(this.trip, this.trip.leavingFrom).getItinerary();
  const plans = dayPlanner.getPlan(itin[dateStr]);
  if(plans && plans.noPlans) return plans.noPlans;
  const html = require('fs').readFileSync(`${htmlBaseDir}/day-plan.html`, 'utf8');
  return html.replace("${date}", dateStr)
             .replace("${city}", plans.city)
             .replace("${plan}", plans.dayPlan);
}

function toNum(month) {
  const monthMap = new Map();
  monthMap.set('january', 0);
  monthMap.set('february', 1);
  monthMap.set('march', 2);
  monthMap.set('april', 3);
  monthMap.set('may', 4);
  monthMap.set('june', 5);
  monthMap.set('july', 6);
  monthMap.set('august', 7);
  monthMap.set('september', 8);
  monthMap.set('october', 9);
  monthMap.set('november', 10);
  monthMap.set('december', 11);
  monthMap.set('jan', 0);
  monthMap.set('feb', 1);
  monthMap.set('mar', 2);
  monthMap.set('apr', 3);
  monthMap.set('may', 4);
  monthMap.set('jun', 5);
  monthMap.set('jul', 6);
  monthMap.set('aug', 7);
  monthMap.set('sep', 8);
  monthMap.set('oct', 9);
  monthMap.set('nov', 10);
  monthMap.set('dec', 11);
  return monthMap.get(Encoder.encode(month));
}

// user enters today. We find out the date in UTC. We use that to determine where the user will be. (Between 6/11 - 6/19 UTC, the user will be in Tel Aviv). We get moment for that timezone and determine the day.
function getTimezone() {
  if(this.testing) return "US/Pacific";
  const dateInUTC = moment().format("M/DD/YYYY");
  const userLocation = {
    '6/10/2017' : "America/New_York",
    '6/11/2017' : "Asia/Tel_Aviv",
    '6/12/2017' : "Asia/Tel_Aviv",
    '6/13/2017' : "Asia/Tel_Aviv",
    '6/14/2017' : "Asia/Tel_Aviv",
    '6/15/2017' : "Asia/Tel_Aviv",
    '6/16/2017' : "Asia/Tel_Aviv",
    '6/17/2017' : "Asia/Tel_Aviv",
    '6/18/2017' : "Asia/Tel_Aviv",
    '6/19/2017' : "Asia/Tel_Aviv",
  };  
  const telAvivList = ["1443244455734100", "1120615267993271", "1420209771356315"];
  const londonList = ["1420839671315623"];
  if(telAvivList.includes(this.fbid)) return "Asia/Tel_Aviv";
  if(londonList.includes(this.fbid)) return "Europe/London";
  return "US/Pacific";
}

module.exports = Commands;
