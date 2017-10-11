'use strict';

const fs = require('fs');
const CreateItinerary = require('trip-itinerary/app/create-itin'); 
const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);
const Encoder = require(`${baseDir}/encoder`);
const moment = require('moment');
const NextActivityGetter = require('calendar-view/app/next-activity-getter');
const MealActivityGetter = require('calendar-view/app/meal-activity-getter');

function DayPlanner(date, trip, fbid) {
  if(!fbid) throw new Error(`DayPlanner: required parameter fbid not passed`);
  if(!trip) throw new Error(`DayPlanner: required parameter trip not passed`);
  if(!date) throw new Error(`DayPlanner: required parameter date not passed`);
  // Type is Date
  this.date = date;
  this.trip = trip;
  this.fbid = fbid;
}

DayPlanner.prototype.getPlan = function(dayItinerary) {
  const date = this.date;
  const dateStr = CreateItinerary.formatDate(date);
  const dayPlan = dayItinerary;
  // logger.debug(`getDayItinerary: getting plans for date ${dateStr}`);
  let city = "";
  const noPlanDateStr = new moment(this.date).format("MMM Do");
  const noPlansMesg = { 
    recipient: {
      id: this.fbid
    },
    message: {
      text: `No plans yet for trip ${this.trip.data.rawName} on ${noPlanDateStr}. Add plans by typing "trip calendar".`,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  if(!dayPlan || (Object.keys(dayPlan).length === 0)) {
    // logger.debug(`getPlan: Itinerary does not contain any information for date ${dateStr} for trip ${this.trip.tripName}`);
    // logger.debug(`getPlan: dump of trip ${this.trip.tripName}; ${JSON.stringify(this.trip)}`);
    return {
      city: this.trip.data.rawName,
      dayPlan: `<li>No plans yet.</li>`,
      noPlans: noPlansMesg
    }
  }
  let plans = [];
  if(dayPlan.city) {
    if(Array.isArray(dayPlan.city)) {
      dayPlan.city.forEach((c,index) => {
        city += capitalize1stChar(c);
        if(index != (dayPlan.city.length - 1)) city += "/";
      });
      this.departureCity = dayPlan.city[0];
      this.arrivalCity = dayPlan.city[dayPlan.city.length - 1];
    }
    else if(dayPlan.city) {
      city = capitalize1stChar(dayPlan.city);
      this.departureCity = city;
      this.arrivalCity = city;
    }
    // logger.debug(`getPlan: dayPlan dump: ${JSON.stringify(dayPlan)}; city: ${city}`);
    // gather weather related information only if city exists for the day
    plans = plans.concat(weatherDetails.call(this, dayPlan));
  }
  const returnDateStr = CreateItinerary.formatDate(new Date(this.trip.data.returnDate));
  // logger.debug(`getPlan: returnDateStr: ${returnDateStr}; date: ${dateStr}`);
  // add flightDetails here only if this is not return date
  if(returnDateStr !== dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  plans = plans.concat(visitDetails.call(this, dayPlan));
  let color = "black";
  if(dayPlan.userInputDetails) {
    const dp = dayPlan.userInputDetails;
    const contents = /^color: (.*)/.exec(dp[0]);
    if(contents) {
      color = contents[1];
      dp.splice(0, 1);
    }
    plans = plans.concat(dp);
  }
  if(returnDateStr === dateStr) plans = plans.concat(flightDetails.call(this, dayPlan));
  if(plans.length === 0) return {
    city: city,
    dayPlan: "<li>No Plans yet.</li>",
    noPlans: noPlansMesg
  };
  return {
    city: city,
    dayPlan: list(plans),
    color: color
  };
}

DayPlanner.prototype.getMealElement = function(meal) {
  if(!this.activityList) throw new Error(`this.activityList is undefined. Maybe you did not call setActivityList?`);
  const date = new moment(this.date).format("Do");
  const errMessage = {
    recipient: {
      id: this.fbid
    },
    message: {
      text: `Cannot find ${meal} details for the ${date}. See activities for that day by typing "${date}"`,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  const mag = new MealActivityGetter(this.activityList);
  const idx = mag.getMealIndex(meal);
  if(idx === -1) {
    logger.error(`getMealElement: could not find index for meal ${meal} for ${date}`);
    return errMessage;
  }
  return activityAsGenericTemplate.call(this, idx);
}

function addViewMoreButton(message, currIndex, lastSet) {
  const payload = `${this.interest}-${currIndex + 1}-recommendation_next_set`;
  const viewMoreButton = [{
    title: "View more",
    type: "postback",
    payload: payload
  }];
  const elements = message.message.attachment.payload.elements;
  // logger.debug(`addViewMoreButton: lastSet: ${lastSet}; elements length: ${elements.length};`);
  // unless this is the last set of activity elements for this day, send along a "view more" button
  if(!lastSet && (elements.length > 1)) message.message.attachment.payload.buttons = viewMoreButton;
  return message;
}

function addButtonsToMessage(message, currIndex, lastSet) {
  const payload = `${this.date.getFullYear()}-${this.date.getMonth()}-${this.date.getDate()}-${currIndex + 1}-itin_second_set`;
  const viewMoreButton = [{
    title: "View more",
    type: "postback",
    payload: payload
  }];
  const returnFlight = [{
    title: "Flight details",
    "type": "postback",
    payload: "return flight"
  }];
  const onwardFlight = [{
    title: "Flight details",
    "type": "postback",
    payload: "flight itinerary"
  }];
  const elements = message.message.attachment.payload.elements;
  // logger.debug(`addButtonsToMessage: lastSet: ${lastSet}; elements length: ${elements.length};`);
  // unless this is the last set of activity elements for this day, send along a "view more" button
  if(!lastSet && (elements.length > 1)) message.message.attachment.payload.buttons = viewMoreButton;
  // TODO: A better way to determine if we want to show the return flight is to see if this is the last activity for this trip.
  // const index = elements.length - 1;
  for(let index = 0; index < elements.length; index++) {
    const subtitle = elements[index].subtitle;
    const title = elements[index].title;
    if((subtitle && subtitle.startsWith("Flight ")) || (title && title.startsWith("Flight "))) {
      const startDateStr = CreateItinerary.formatDate(new Date(this.trip.data.startDate));
      const nextDay = new Date(this.trip.data.startDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = CreateItinerary.formatDate(nextDay);
      const dateStr = CreateItinerary.formatDate(this.date);
      // logger.debug(`addButtonsToMessage: Start date ${startDateStr}; this.date ${dateStr}`);
      if(startDateStr === dateStr || (dateStr === nextDayStr)) {
        // logger.debug(`addButtonsToMessage:: Adding onward flight postback button to message.`);
        elements[index].buttons = onwardFlight;
      }
      else {
        // logger.debug(`addButtonsToMessage:: Adding return flight postback button to message`);
        elements[index].buttons = returnFlight;
      }
    }
    // TODO: Think of a better way
    // Show hotel receipt only if the element has a hotel_name entry. This way, we show the hotel corresponding to this day rather than ask the customer to choose
    else if(title && new RegExp(["checkin", "checkout", "check-in", "check-out"].join("|")).test(Encoder.encode(title)) && elements[index].hotel_name) {
      const hotelReceipt = [{
        title: "Hotel Receipt",
        "type": "postback",
        payload: `hotel details ${elements[index].hotel_name}`
      }];
      // delete the hotel_name entry because this element will be sent to facebook, which does not understand "hotel_name"
      delete elements[index].hotel_name;
      elements[index].buttons = hotelReceipt;
    }
  }
  return message;
}

DayPlanner.prototype.getRecommendations = function(interest, index) {
  let currIndex = 0;
  if(index) currIndex = index; 
  let file;
  let makeFirstElementCompact = false;
  switch(interest) {
    case "airport_to_hotel":
      makeFirstElementCompact = true;
      file = this.trip.airportToHotelFile();
      break;
    case "hotel_to_airport":
      makeFirstElementCompact = true;
      file = this.trip.hotelToAirportFile();
      break;
    case "running_trail": 
      file = this.trip.runningTrailFile();
      break;
    case "vegetarian_restaurants":
      file = this.trip.vegRestaurantsFile();
      break;
    case "walking_tours":
      file = this.trip.walkingToursFile();
      break;
    case "rome_walking_tours":
      file = this.trip.walkingToursFile("rome");
      break;
    case "monterosso_activities":
      file = "/home/ec2-user/trips/aeXf/milan-monterosso-activities.json";
      break;
    case "glacier_activities":
      file = "/home/ec2-user/trips/aeXf/iceland-glacier-activities.json";
      break;
    case "ita_ms":
      file = "/home/ec2-user/trips/aeXf/seattle-ita-ms.json";
      break;
    case "da_ms":
      file = "/home/ec2-user/trips/aeXf/seattle-da-ms.json";
      break;
  };
  const errMessage = {
    recipient: {
      id: this.fbid
    },
    message: {
      text: `Unable to get details for keyword "${interest}" for trip ${this.trip.data.rawName}`,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  if(!file) {
    // see if interest is an event name ('phocuswright', 'arival' etc.)
    const message = handleEventRelatedInterest.call(this, interest, currIndex);
    if(message) return message;
  }
  logger.debug(`getRecommendations: Looking at file ${file}`);
  if(!file || !fs.existsSync(file)) {
    logger.error(`getRecommendations: cannot find any file ${file} that matches interest ${interest} for trip ${this.trip.data.rawName}`);
    return errMessage;
  }
  try {
    const activityList = JSON.parse(fs.readFileSync(file, 'utf8'));
    this.interest = interest;
    const message = createListTemplate.call(this, activityList, currIndex);
    if(makeFirstElementCompact && message.message.attachment.payload.elements.length > 1) message.message.attachment.payload.top_element_style = "compact";
    return message;
  }
  catch(err) {
    logger.error(`getRecommendations: Error: ${err.stack}`);
    errMessage.message.text = `Unable to get details around keyword "${interest}" for trip ${this.trip.data.rawName}`;
    return errMessage;
  }
}

function handleEventRelatedInterest(interest, index) {
  // nothing to do if the interest does not contain a ':' or is not an event name
  const events = this.trip.getEvents();
  logger.debug(`handleEventRelatedInterest: Looking at interest ${interest} with index ${index}`);
  if(!interest.includes(':') && (!events || !events.includes(interest))) return;
  // if this is the event name, simply call getEventItinerary(), which does the right thing. This might be a case that is never used.
  // logger.debug(`handleEventRelatedInterest: interest includes ":"`);
  if(events && events.includes(interest)) return this.getEventItinerary([interest]);
  let contents = /^(.*):(.*)/.exec(interest);  
  // only the following regex formats are valid: "phocuswright:oct_11", "arival:theater" 
  if(!contents || contents.length < 3) return null;
  // logger.debug(`handleEventRelatedInterest: content details: ${contents}`);
  const eventName = contents[1];
  // expect to match "Oct 11", "sep 1" etc.
  const key = Encoder.decode(contents[2]);
  if(/^[A-Za-z]{3} \d+$/.exec(key)) {
    const file = this.trip.eventItineraryFile(eventName);
    const itin = JSON.parse(fs.readFileSync(file, 'utf8'));
    this.interest = `${eventName}:${contents[2]}`;
    // logger.debug(`handleEventRelatedInterest: calling createList template with eventName ${eventName}, itin key: ${key} and index: ${index}`);
    return createListTemplate.call(this, itin[key], index);
  }
  // logger.debug(`handleEventRelatedInterest: handling event details.`);
  const file = this.trip.eventDetailsFile(contents[1], contents[2]);
  // check if the file exists so that we can return null
  if(!fs.existsSync(file)) return null;
  return handleEventDetails.call(this, contents[1], contents[2], index);
}

function handleEventDetails(eventName, detailsFile, idx) {
  const errMessage = {
    recipient: {
      id: this.fbid
    },
    message: {
      text: `Unable to get event details for trip ${this.trip.rawTripName} at this time`,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  const file = this.trip.eventDetailsFile(eventName, detailsFile);
  logger.debug(`looking at file ${file}; eventName: ${eventName}; detailsFile: ${detailsFile}`);
  if(!fs.existsSync(file)) return errMessage;
  this.interest = `${Encoder.encode(eventName)}:${detailsFile}`;
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  return createListTemplate.call(this, json, idx);
}

DayPlanner.prototype.getEventItinerary = function(contents) {
  const errMessage = {
    recipient: {
      id: this.fbid
    },
    message: {
      text: `Unable to get event itinerary for trip ${this.trip.rawTripName} at this time`,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };
  try {
    if(!contents) {
      logger.error(`getEventItinerary: passed array does not exist or is invalid: ${(contents) ? contents : "array is null"}`);
      return errMessage;
    }
    logger.debug(`getEventItinerary: content details are ${contents}. length is ${contents.length}`);
    // set the event name as interest.
    const eventName = (contents.length === 1) ? contents[0] : contents[1];
    this.interest = Encoder.encode(eventName);
    if(contents[0] === "pb_event_details_breakdown") return handleEventDetails.call(this, eventName, contents[2], 0);
    const file = this.trip.eventItineraryFile(eventName);
    // contents[2] might exist because it was set as part of pb_event_details_day postback below.
    const itin = JSON.parse(fs.readFileSync(file, 'utf8'));
    if(contents[2]) {
      const key = Encoder.decode(contents[2]);
      // logger.debug(`getEventItinerary: event day key is: ${key}`);
      this.interest = `${eventName}:${contents[2]}`;
      return createListTemplate.call(this, itin[key], 0);
      // logger.debug(`getEventItineraryNew: sending message ${JSON.stringify(message)}`);
    }
    const messageData = {
      recipient: {
        id: this.fbid
      },
      message: {
        attachment: {
          type: "template",
          payload: {
            template_type: "generic",
          }
        }
      }
    };
    const elements = [{
      title: "Conference Dates",
      buttons: []
    }];
    Object.keys(itin).forEach((day) => {
      elements[0].buttons.push({
        type: "postback",
        title: `${day}`,
        payload: `pb_event_details_day ${eventName} ${Encoder.encode(day)}`
      });
    });
    messageData.message.attachment.payload.elements = elements;
    // set this as the trip's conferenceInContext
    this.trip.setConferenceInContext(eventName);
    // logger.debug(`getEventItineraryNew: returning message ${JSON.stringify(messageData)}`);
    return messageData;
  }
  catch(err) {
    logger.error(`getEventItinerary: error in getting event itinerary: ${err.stack}`);
    return errMessage; 
  }
}

// see if there is a plan in the events file for the given day. if there is, use that.
function getEventPlanForDay(setNum) {
  logger.debug(`getEventPlanForDay: Checking to see if there is an event plan for day ${this.date}`);
  const file = this.trip.eventItineraryFile();
  if(!file) {
    logger.info(`getEventPlanForDay: no event file from trip`);
    return null;
  }
  const key = new moment(this.date).format("MMM D");
  const dayAsList = JSON.parse(fs.readFileSync(file, 'utf8'));
  // logger.debug(`keys: ${Object.keys(dayAsList)}; key is ${key}`);
  if(dayAsList[key]) return createListTemplate.call(this, dayAsList[key], setNum);
  return null;
}

// Facebook supports sending only 4 items in an elementList. So, use payload (see below) to pass around the index for the next set of items. 
DayPlanner.prototype.getPlanAsList = function(setNum) {
  let file = this.trip.dayItineraryFile(this.date);
  // logger.debug(`getPlanAsList: using list template to display itin for date ${CreateItinerary.formatDate(this.date)} and file ${file}`);
  try {
    // read the itinerary file, which is a list of json objects. Push each json object (which contains utmost 4 elements) into an array. Then, based on the index (either passed or defaults to 0), return the corresponding element set.
    if(!fs.existsSync(file)) return getEventPlanForDay.call(this, setNum);
    const dayAsList = JSON.parse(fs.readFileSync(file, 'utf8'));
    return createListTemplate.call(this, dayAsList, setNum);
  }
  catch(e) {
    logger.error(`error in getting plans for date ${this.date}: ${e.stack}`);
    return null;
  }
}

function createListTemplate(list, setNum) {
    const elementSet = [];
    Object.keys(list).forEach(key => {
      // ignore the keyword entry. it's used for keyword matches.
      if(key === "keywords") return;
      elementSet.push(list[key]);
    });
    let currIndex = 0;
    if(setNum) currIndex = setNum;
    // logger.debug(`createListTemplate: elementSet: ${JSON.stringify(elementSet)}; number of elements: ${elementSet.length}`);
    const elements = elementSet[currIndex];
    let message = {
      recipient: {
        id: this.fbid
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
    // if there is only one element in elements, then use a "generic" template instead of "list" template. 
    if(elements.length === 1) {
      message.message.attachment.payload.template_type = "generic";
      message.message.attachment.payload.image_aspect_ratio = "square";
    }
    message.message.attachment.payload.elements = elements;
    // logger.debug(`getPlanAsList: currIndex: ${currIndex}; elementSet length: ${elementSet.length}; this.date: ${this.date}`);
    // the last parameter indicates whether this is the lastSet or not.
    if(this.date === "invalid") message = addViewMoreButton.call(this, message, currIndex, currIndex >= (elementSet.length -1));
    else message = addButtonsToMessage.call(this, message, currIndex, currIndex >= (elementSet.length - 1));
    // logger.debug(`createListTemplate: message is ${JSON.stringify(message)}`);
    // the first item in the list is almost always a map, so we don't set the style to compact. Subsequent items are just normal.
    if(currIndex > 0 && message.message.attachment.payload.template_type != "generic") message.message.attachment.payload.top_element_style = "compact";
    if(setNum === 0 && elements.length > 1 && !elements[0].image_url) message.message.attachment.payload.top_element_style = "compact";
    return message;
}

DayPlanner.prototype.getPartOfDay = function(part) {
  let message = {
    recipient: {
      id: this.fbid
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
  logger.debug(`getPartOfDay: activityList is ${JSON.stringify(this.activityList)}`);
  let elements = [];
  switch(part) {
    case "morning": 
      for(let i = 1; i < 5; i++) {
        elements.push(this.activityList[i]);
      }
      break;
    case "noon":
      for(let i = 5; i < 8; i++) {
        elements.push(this.activityList[i]);
      }
      break;
    case "evening":
      for(let i = 8; i < 10; i++) {
        elements.push(this.activityList[i]);
      }
      break;
    default:
      return null;
  }
  message.message.attachment.payload.elements = elements;
  logger.debug(`getPartOfDay: Returning message ${JSON.stringify(message)}`);
  return message;
}

DayPlanner.prototype.setActivityList = function() {
  if(this.activityList) return; // make this method idempotent
  try {
    const file = this.trip.dayItineraryFile(this.date);
    logger.debug(`setActivityList: getting activity from itin for date ${this.date} and file ${file}`);
    const dayItin = JSON.parse(fs.readFileSync(file, 'utf8'));
    this.activityList = [];
    Object.keys(dayItin).forEach(key => {
      if(!Array.isArray(dayItin[key])) throw new Error(`setActivityList: itin for date ${this.date} from file ${file} and key ${key} needs to be an array. But it's not. It's value is ${dayItin[key]}`);
      // only add actual activities to the list. for example, we tack on a "Itinerary as a map" item. Ignore that..
      if(dayItin[key][0].title.includes("itinerary as a map")) dayItin[key].splice(0, 1);
      this.activityList = this.activityList.concat(dayItin[key]);
      // logger.debug(`key is ${key}; item is ******** ${JSON.stringify(dayItin[key])}; ******** this.activiyt: ${JSON.stringify(this.activityList)}`);
    }, this);
    // logger.debug(`dayItin: ${JSON.stringify(dayItin)}; activity list: ${JSON.stringify(this.activityList)}`);
  }
  catch(e) {
    logger.error(`error getting activities for date ${this.date}: ${e.stack}`);
  }
}

// TODO: Replace getPrevActivity & getNextActivity by activityAsGenericTemplate and remove these functions.
DayPlanner.prototype.getPrevActivity = function(idx) {
  const result = activityAsGenericTemplate.call(this, idx);
  return result;
}

DayPlanner.prototype.getNextActivity = function(idx) {
  const result = activityAsGenericTemplate.call(this, idx);
  return result;
}

DayPlanner.prototype.getNextActivityRelativeToTime = function() {
  const errMessage = {
      recipient: {
        id: this.fbid
      },
      message: {
        text: `unable to get "next" activity for today. We are actively looking into the issue. In the meanwhile, you can try "first" or "today" to get the itinerary details`,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
  };
  try {
    const date = this.date.getDate();
    logger.debug(`getNextActivityRelativeToTime: getting next activity for date ${date}`);
    const nag = new NextActivityGetter(this.trip, date, this.activityList);
    const index = nag.getNext();
    if(index < 0 || index > this.activityList.length) {
      logger.error(`getNextActivityRelativeToTime: index ${index} out of bounds for date ${date}`);
      return errMessage;
    }
    return activityAsGenericTemplate.call(this, index);
  }
  catch(e) {
    logger.error(`getNextActivityRelativeToTime: error ${e.stack}`);
    return errMessage;
  }
}

function activityAsGenericTemplate(idx) {
  if(!this.activityList) throw new Error(`activityAsGenericTemplate: this.activityList is not defined. Maybe you forgot to call setActivityList before calling me?`);
  if(idx >= this.activityList.length) {
    return {
      recipient: {
        id: this.fbid
      },
      message: {
        text: `No more activities. Get previous activity with command "prev for ${this.date.getDate()}th". You can also type "first ..." to get first activity`,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };
  }
  if(idx < 0) {
    return {
      recipient: {
        id: this.fbid
      },
      message: {
        text: `Already at first activity. Get next activity with commmand "next for ${this.date.getDate()}th". You can also type "first ..." to get first activity`,
        metadata: "DEVELOPER_DEFINED_METADATA"
      }
    };
  }
  const elements = [];
  elements.push(this.activityList[idx]);
  // logger.debug(`activityAsGenericTemplate: date: ${new moment(this.date).format("D")}; date: ${new moment(this.date).format("Do")}`);
  const prefix = `"Activity ${idx + 1} on ${new moment(this.date).format("Do")}"`;
  if(elements[0].subtitle) elements[0].subtitle = `${prefix}: ${elements[0].subtitle}`;
  else elements[0].subtitle = prefix;
  let buttons = [];
  let payloadPrefix = `${this.date.getFullYear()}-${this.date.getMonth()}-${this.date.getDate()}-${idx}-`;
  if(idx > 0) {
    const payload = payloadPrefix.concat(`prev`);
    buttons.push({
      title: "Prev",
      type: "postback",
      payload: payload
    });
  }
  if(idx != (this.activityList.length - 1)) {
    const payload = payloadPrefix.concat(`next`);
    buttons.push({
      title: "Next",
      type: "postback",
      payload: payload
    });
  }
  if(buttons.length > 0) elements[0].buttons = buttons;
  
  let message = {
    recipient: {
      id: this.fbid
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: elements
        }
      }
    }
  };

  return message;
}

DayPlanner.parseActivityPostback = function(payload) {
  let contents = /^(\d+)-(\d+)-(\d+)-(\d)-(.*)/.exec(payload);  
  if(!contents) return null;
  const date = new Date(contents[1], contents[2], contents[3]);
  return {
    date: date,
    idx: parseInt(contents[4]),
    dir: contents[5]
  };
}

DayPlanner.parseDayItinPostback = function(payload) {
  let contents = /^(\d+)-(\d+)-(\d+)-(\d)-itin_second_set/.exec(payload);  
  if(!contents) return null;
  const date = new Date(contents[1], contents[2], contents[3]);
  const count = parseInt(contents[4]);
  return {
    date: date,
    number: count
  };
}

DayPlanner.parseRecommendationPostback = function(payload) {
  let contents = /^(.*)-(\d+)-recommendation_next_set/.exec(payload);  
  logger.debug(`parseRecommendationPostback: parsed ${payload}; contents are ${contents}`);
  if(!contents) return null;
  return {
    interest: Encoder.encode(contents[1]),
    idx: parseInt(contents[2]),
  };
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
  if(dayPlan.city && !weather.city) weather.city = dayPlan.city;
  if(!Array.isArray(weather)) { plans.push(weatherString(weather)); return plans; }
  // we have been sent an array of weather. That means there are multiple cities on the same day in the itinerary.
  weather.forEach((cityWeather,idx) => {
    if(!cityWeather.city) cityWeather.city = dayPlan.city[idx];
    plans.push(weatherString(cityWeather));
  });
  // logger.debug(`weatherDetails: returning array of length ${plans.length}`);
  return plans;
}

function weatherString(weather) {
  let rain = "";
  if(weather.chanceofrain && weather.chanceofrain !== '0') rain += `; Chance of rain: <b>${weather.chanceofrain}%</b>`;
  let city = "";
  if(weather.city) city += `<b>${capitalize1stChar(weather.city)}</b>`;
  let img;
  if(weather.cloud_cover === "mostly sunny") img = "mostly-sunny-16";
  if(weather.cloud_cover === "partly cloudy") img = "partly-sunny-16";
  if(weather.cloud_cover === "clear") img = "clear-sunny-16";
  if(weather.cloud_cover === "cloudy" || weather.cloud_cover === "mostly cloudy") img = "cloudy-16";
  if(weather.cloud_cover === "partly cloudy rainy") img = "partly-cloudy-rainy-16";
  if(weather.cloud_cover === "thunderstorms") img = "thunderstorms-16";
  if(weather.cloud_cover === "showers") img = "showers-24";
  if(weather.cloud_cover === "am showers") img = "showers-24";
  if(weather.cloud_cover === "pm showers") img = "showers-24";
  const comment = weather.comment ? `${weather.comment}.`: "";
  
  img = (img) ? `<img src="https://polaama.com/images/${img}"/>`: "";
  return `${img} ${city} weather: ${capitalize1stChar(weather.cloud_cover)}; <span style="font-size:small">${weather.max_temp}&degF/${weather.min_temp}&degF</span>${rain}. ${comment}`;
}

function flightDetails(dayPlan) {
  let plans = [];
  // let flightPlans = `<div data-role="content" data-enhance="false">`;
  let flightPlans = `<img src="https://polaama.com/images/plane-flight-icon"/> `;
  if(dayPlan.startTime) flightPlans += `Leaving ${capitalize1stChar(this.departureCity)} at <b>${dayPlan.startTime}</b>; `;
  if(dayPlan.arrivalTime) flightPlans += `Arriving in ${capitalize1stChar(this.arrivalCity)} at <b>${dayPlan.arrivalTime}</b>`;
  if(dayPlan.startTime || dayPlan.arrivalTime) plans.push(flightPlans);
  // flightPlans += "</div>";
  // logger.debug(`flightDetails: returning array of length ${plans.length}`);
  return plans;
}

function list(planList) {
  if(planList.length === 0) return "<li>No plans yet.</li>";
  let list = "";
  planList.forEach(l => {
    list += `<li><div data-role="content" data-enhance="false" style="font-size:16px; white-space: normal;">${l}</div></li>`;
  });
  return list;
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

module.exports = DayPlanner;
