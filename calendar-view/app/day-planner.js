'use strict';

const fs = require('fs');
const CreateItinerary = require('trip-itinerary/app/create-itin'); 
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

function DayPlanner(date, dayItinerary, trip) {
  this.date = date;
  this.dayPlan = dayItinerary;
  this.trip = trip;
}

DayPlanner.prototype.getPlan = function() {
  const date = this.date;
  const dateStr = CreateItinerary.formatDate(date);
  const dayPlan = this.dayPlan;
  logger.debug(`getDayItinerary: getting plans for date ${dateStr}`);
  let city = "";
  if(!dayPlan) {
    logger.info(`getPlan: Itinerary does not contain any information for date ${dateStr}`);
    return {
      city: this.trip.data.rawName,
      dayPlan: `<li>No details available for date ${dateStr}</li>`
    }
  }
  if(Array.isArray(dayPlan.city)) {
    dayPlan.city.forEach((c,index) => {
      city += capitalize1stChar(c);
      if(index != (dayPlan.city.length - 1)) city += "/";
    });
    this.departureCity = dayPlan.city[0];
    this.arrivalCity = dayPlan.city[dayPlan.city.length - 1];
  }
  else {
    city = capitalize1stChar(dayPlan.city);
    this.departureCity = city;
    this.arrivalCity = city;
  }
  // logger.debug(`getPlan: dayPlan city: ${dayPlan.city}`);
  if(!dayPlan) return `No itinerary exists for date ${dateStr} for trip ${this.trip.data.rawName}, which starts on ${this.trip.data.startDate} and ends on ${this.trip.data.returnDate}`;
  // logger.debug(`getPlan: dayPlan dump: ${JSON.stringify(dayPlan)}; city: ${city}`);
  let plans = [];
  plans = plans.concat(weatherDetails.call(this, dayPlan));
  const returnDateStr = CreateItinerary.formatDate(new Date(this.trip.data.returnDate));
  // add flightDetails here only if this is not return date
  // logger.debug(`getPlan: returnDateStr: ${returnDateStr}; date: ${dateStr}`);
  if(returnDateStr !== dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  plans = plans.concat(visitDetails.call(this, dayPlan));
  if(dayPlan.userInputDetails) plans = plans.concat(dayPlan.userInputDetails);
  if(returnDateStr === dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  return {
    city: city,
    dayPlan: list(plans)
  };
}

// Facebook supports sending only 4 items in an elementList. So, use payload (see below) to pass around the index for the next set of items. 
DayPlanner.prototype.getPlanAsList = function(fbid, setNum) {
  const file = this.trip.dayItineraryFile(this.date);
  logger.debug(`getPlanAsList: using list template to display itin for date ${this.date} and file ${file}`);
  try {
    const dayAsList = JSON.parse(fs.readFileSync(file, 'utf8'));
    const elementSet = [];
    Object.keys(dayAsList).forEach(key => {
      elementSet.push(dayAsList[key]);
    });
    let currIndex = 0;
    if(setNum) currIndex = setNum;
    const elements = elementSet[currIndex];
    const payload = `${this.date.getFullYear()}-${this.date.getMonth()}-${this.date.getDate()}-${currIndex + 1}-itin_second_set`;
    let message = {
      recipient: {
        id: fbid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
          }
        }
      }
    };
    const viewMoreButton = [{
        title: "View more",
        type: "postback",
        payload: payload
    }];
    message.message.attachment.payload.elements = elements;
    if(currIndex < (elementSet.length - 1)) message.message.attachment.payload.buttons = viewMoreButton;
    // the first item in the list is always a map, so we don't set the style to compact. Subsequent items are just normal.
    if(currIndex > 0) message.message.attachment.payload.top_element_style = "compact";
    return message;
  }
  catch(e) {
    logger.error(`error in getting plans for date ${this.date}: ${e.stack}`);
    return null;
  }
}

DayPlanner.prototype.getPlanAsListOld = function(fbid, whichSet) {
  const file = this.trip.dayItineraryFile(this.date);
  logger.debug(`getPlanAsList: using list template to display itin for date ${this.date} and file ${file}`);
  try {
    const dayAsList = JSON.parse(fs.readFileSync(file, 'utf8'));
    const numSets = Object.keys(dayAsList);
    let message = {
      recipient: {
        id: fbid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
          }
        }
      }
    };
    if(!whichSet || (whichSet === "first")) {
      const viewMoreButton = [{
        title: "View more",
        type: "postback",
        payload: `${this.date.getFullYear()}-${this.date.getMonth()}-${this.date.getDate()}-itin_second_set`
      }];
      message.message.attachment.payload.elements = dayAsList.firstSet;
      message.message.attachment.payload.buttons = viewMoreButton;
    }
    else {
      message.message.attachment.payload.elements = dayAsList.secondSet;
      // the first item in the list is always a map, so we don't set the style to compact. Subsequent items are just normal.
      message.message.attachment.payload.top_element_style = "compact";
    }
    return message;
  }
  catch(e) {
    logger.error(`error in getting plans for date ${this.date}: ${e.stack}`);
    return null;
  }
}

function visitDetails(dayPlan) {
  let plans = [];
  if(!dayPlan.visit) return plans;
  const visiting = dayPlan.visit;
  visiting.forEach(i => {
    plans.push(`Visit ${i}. Get <a href="https://www.google.com/maps/search/${encodeURIComponent(i)}">directions</a>`);
  });
  return plans;
}

function weatherDetails(dayPlan) {
  let plans = [];
  if(!dayPlan.weather) return plans;
  const weather = dayPlan.weather;
  if(!Array.isArray(weather)) { plans.push(weatherString(weather)); return plans; }
  // we have been sent an array of weather. That means there are multiple cities on the same day in the itinerary.
  weather.forEach(cityWeather => {
    plans.push(weatherString(cityWeather));
  });
  logger.debug(`weatherDetails: returning array of length ${plans.length}`);
  return plans;
}

function weatherString(weather) {
  let rain = "";
  if(weather.chanceofrain !== '0') rain += `; Chance of rain: <b>${weather.chanceofrain}%</b>`;
  let city = "";
  if(weather.city) city += ` at <b>${capitalize1stChar(weather.city)}</b>`;
  return `<div data-role="content" data-enhance="false">Weather${city}: Avg min temp: <b>${weather.min_temp}&degF</b>; Max temp: <b>${weather.max_temp}&degF</b>; It will be <b>${weather.cloud_cover}</b> today. ${rain}</div>`;
}

function flightDetails(dayPlan) {
  let plans = [];
  let flightPlans = `<div data-role="content" data-enhance="false">`;

  if(dayPlan.startTime) flightPlans += `Leaving ${capitalize1stChar(this.departureCity)} at <b>${dayPlan.startTime}</b>; `;
  if(dayPlan.arrivalTime) flightPlans += `Arriving in ${capitalize1stChar(this.arrivalCity)} at <b>${dayPlan.arrivalTime}</b>`;
  flightPlans += "</div>";
  if(dayPlan.startTime || dayPlan.arrivalTime) plans.push(flightPlans);
  logger.debug(`flightDetails: returning array of length ${plans.length}`);
  return plans;
}

function list(planList) {
  if(planList.length === 0) return "<li>No plans yet</li>";
  let list = "";
  planList.forEach(l => {
    list += `<li>${l}</li>`;
  });
  return list;
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

module.exports = DayPlanner;
