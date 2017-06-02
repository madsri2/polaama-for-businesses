'use strict';
const moment = require('moment-timezone');
const CreateItinerary = require('trip-itinerary/app/create-itin');
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const htmlBaseDir = "/home/ec2-user/html-templates"; // TODO: Move this to config.

function PlansForTomorrow(trip, departureCity) {
  this.trip = trip;
  this.departureCity = departureCity;
}

PlansForTomorrow.prototype.get = function() {
  // Calculate tomorrow from today.
  let tz = "America/Los_Angeles";
  if(this.trip.portOfEntry === "albuquerque") tz = "America/Cambridge_Bay";
  const tomorrow = moment().tz(tz).add(1, 'days').format("M/D/YYYY"); // MDT
  // Get the data for tomorrow from Itinerary file.
  const tripItin = new CreateItinerary(this.trip, this.departureCity).getItinerary();
  const plansForTomorrow = tripItin[tomorrow];
  logger.debug(`get: plan for tomorrow (${tomorrow}) is ${JSON.stringify(plansForTomorrow)}`);
  // format and return
  const html = require('fs').readFileSync(`${htmlBaseDir}/day-plan.html`, 'utf8');
  return html.replace("${date}", tomorrow)
             .replace("${city}", plansForTomorrow.city)
             .replace("${plan}", list(plansForTomorrow.userInputDetails));
}

function list(planList) {
  if(!planList) return "<li>No plans yet</li>";
  let list = "";
  planList.forEach(l => {
    list += `<li>${l}</li>`;
  });
  return list;
}

module.exports = PlansForTomorrow;
