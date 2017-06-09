'use strict';

const moment = require('moment');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const DayPlanner = require('calendar-view/app/day-planner');
const htmlBaseDir = "/home/ec2-user/html-templates"; // TODO: Move this to config.
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);

function Commands(trip) {
  this.trip = trip;
  this.itin = new CreateItinerary(this.trip, this.trip.leavingFrom).getItinerary();
}

Commands.prototype.handle = function(command) {
  this.command = command;
  return handleDayItin.call(this);
}

Commands.prototype.canHandle = function(command) {
  this.command = command;
  if(this.command.startsWith("tomorrow")) return true;
  if(this.command.startsWith("today")) return true;
  return isDateValid.call(this);
}

Commands.prototype.getPath = function(command) {
  if(this.command.startsWith("tomorrow")) return "tomorrow";
  if(this.command.startsWith("today")) return "today";
  if(!this.date && !isDateValid.call(this)) throw new Error(`getPath: invalid command ${command}`);
  return new moment(this.date).format("YYYY-MM-DD");
}

function handleDayItin() {
  // TODO: today & tomorrow is currently in the context of the machine's timezone (UTC). Change this to reflect the location of the caller.
  if(this.command.startsWith("tomorrow")) return getTomorrowsItin.call(this);
  if(this.command.startsWith("today")) return getTodaysItin.call(this);
  return itinForSpecificDate.call(this);
}

function isDateValid() {
  let contents = /([a-zA-Z]+) *(\d+)/.exec(this.command);
  if(contents) this.date = new Date(2017, toNum(contents[1]), contents[2]);    
  if(!this.date) {
    contents = /(\d+)\/(\d+)/.exec(this.command);
    if(contents) this.date = new Date(2017, contents[1]-1, contents[2]);    
  }
  if(!this.date) {
    contents = /(\d+)-(\d+)-(\d+)/.exec(this.command);
    if(contents) this.date = new Date(this.command);
    else {
      logger.error(`isDateValid: unknown format ${this.command}`);
      return false;
    }
  }
  return true;
}

function itinForSpecificDate() {
  if(!isDateValid.call(this)) return null;
  return getDayItinerary.call(this);
}

function getDayItinerary() {
  const dateStr = CreateItinerary.formatDate(this.date);
  const dayPlanner = new DayPlanner(this.date, this.itin[dateStr], this.trip); 
  const plans = dayPlanner.getPlan();
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

function getTomorrowsItin() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  this.date = tomorrow;
  return getDayItinerary.call(this);
}

function getTodaysItin() {
  this.date = new Date();
  return getDayItinerary.call(this);
}

function getTimezone(city) {
  if(this.trip.portOfEntry === "albuquerque") return "America/Cambridge_Bay";
  if(this.trip.portOfEntry === "tel_aviv") return "Asia/Tel_Aviv";
}

module.exports = Commands;
