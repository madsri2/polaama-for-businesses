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
  logger.debug(`getPlan: dayPlan city: ${dayPlan.city}`);
  if(!dayPlan) return `No itinerary exists for date ${dateStr} for trip ${this.trip.data.rawName}, which starts on ${this.trip.data.startDate} and ends on ${this.trip.data.returnDate}`;
  logger.debug(`getPlan: dayPlan dump: ${JSON.stringify(dayPlan)}; city: ${city}`);
  let plans = [];
  plans = plans.concat(weatherDetails.call(this, dayPlan));
  const returnDateStr = CreateItinerary.formatDate(new Date(this.trip.data.returnDate));
  // add flightDetails here only if this is not return date
  logger.debug(`getPlan: returnDateStr: ${returnDateStr}; date: ${dateStr}`);
  if(returnDateStr !== dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  plans = plans.concat(visitDetails.call(this, dayPlan));
  if(dayPlan.userInputDetails) plans = plans.concat(dayPlan.userInputDetails);
  if(returnDateStr === dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  return {
    city: city,
    dayPlan: list(plans)
  };
}

DayPlanner.prototype.getPlanAsList = function(fbid, whichSet) {
  const file = this.trip.dayItineraryFile(this.date);
  logger.debug(`getPlanAsList: using list template to display itin for date ${this.date} and file ${file}`);
  try {
    const dayAsList = JSON.parse(fs.readFileSync(file, 'utf8'));
    let message = {
      recipient: {
        id: fbid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "list",
            "top_element_style": "compact",
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
    else message.message.attachment.payload.elements = dayAsList.secondSet;
    return message;
  }
  catch(e) {
    logger.error(`error in getting plans for date ${this.date}: ${e.stack}`);
    return null;
  }
}

DayPlanner.prototype.getDayPlanAsList = function(fbid) {
  const firstElementSet = [
      {
        title: "Breakfast at Carlton's",
        image_url: "http://www.touryourway.com/uploadImages/systemFiles/Carlton-hotel-Tel-Aviv%20(2).jpg",
        default_action: {
          type: "web_url",
          url: "www.carlton.co.il/en",
          "webview_height_ratio": "full",
        }
      },
      {
        title: '08:30: "An Overview of the Middle East & Israel" by Michael Bauer',
        subtitle: "Walking tour along Rothschild Boulevard",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-2",
          "webview_height_ratio": "full",
        }
      },
      {
        title: '11:30: Meet with Inbal Arieli and Nadav Zafrir',
        subtitle: "An Overview of the Israeli Tech Ecosystem and Its Roots at TBD",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-3",
          "webview_height_ratio": "full",
        }
      },
      {
        title: '13:00: Lunch at Vicky & Crostina',
        image_url: "https://media-cdn.tripadvisor.com/media/photo-s/02/7b/38/90/vicky-cristina.jpg",
        default_action: {
          type: "web_url",
          url: "https://www.tripadvisor.com/Restaurant_Review-g293984-d2223803-Reviews-Vicky_Cristina-Tel_Aviv_Tel_Aviv_District.html",
          "webview_height_ratio": "full",
        }
      }
  ];
  const viewMoreButton = [{
    title: "View more",
    type: "postback",
    payload: "todays_itin_next_set"
  }];
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          "top_element_style": "compact",
          elements: firstElementSet,
          buttons: viewMoreButton
        }
      }
    }
  };
  return message;
}

DayPlanner.prototype.getDayPlanNextSet = function(fbid) {
  const nextElementSet = [
      {
        title: "Free time or meeting time",
        subtitle: "Option 1: Krav Maga(16:00 - 17:00) at beach near hotel; Option 2: SAP rental",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-5",
          "webview_height_ratio": "full",
        }
      },
      {
        title: "18:00: Meet with Dani Gold at the hotel",
        subtitle: "Dr. Daniel Gold is an expert on technology and innovation.",
        default_action: {
          type: "web_url",
          url: "https://polaama.com/aeXf/tel_aviv/itin-detail/tel-aviv-2017-06-12-item-6",
          "webview_height_ratio": "full",
        }
      },
      {
        title: "Cohort time. Summer Mixers event with members from Israeli tech ecosystem at TBD",
        subtitle: "Followed by night-out at Tel Aviv",
      },
      {
        title: 'Overnight stay at Carlton',
        image_url: "http://www.touryourway.com/uploadImages/systemFiles/Carlton-hotel-Tel-Aviv%20(2).jpg",
        default_action: {
          type: "web_url",
          url: "http://www.carlton.co.il/en",
          "webview_height_ratio": "full",
        }
      }
  ];
  const message = {
    recipient: {
      id: fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "list",
          "top_element_style": "compact",
          elements: nextElementSet,
        }
      }
    }
  };
  return message;
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
