'use strict';

const baseDir = "/home/ec2-user";
const fs = require('fs');
const _ = require('lodash');
const TripData = require('./trip-data');
const logger = require('./my-logger');
const CalendarFormatter = require('./calendar-view/app/formatter');

function TripDataFormatter(trip, fbid) {
  if(!trip) throw new Error(`TripDataFormatter: required parameter trip not passed`);
  if(!fbid) this.fbid = trip.fbid;
  else this.fbid = fbid;
  // TODO: This needs to change when we add login by facebook to myFirstHttpServer.
  this.trip = trip;
}

TripDataFormatter.prototype.formatListResponse = function(headers, key) {
  const tripName = this.trip.data.name;
  const list = this.trip.getInfoFromTrip(key);
  if(!list) {
    return `Could not find ${key} for trip ${tripName}`;
  }
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("header or user-agent not defined. sending back json");
    return list;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("request call from browser. sending back html");
    return listAsHtml(list);
  }
  logger.info("request call from something other than browser. sending back json");
  return list;
}

TripDataFormatter.prototype.formatComments = function() {
  const comments = this.trip.parseComments();
  if(Object.keys(comments).length === 0) {
    const html = fs.readFileSync(`${baseDir}/html-templates/no-data-available.html`, 'utf8');
    return html.replace("${tripName}",this.trip.rawTripName)
               .replace("${title}", "Comments");
  }
  const html = fs.readFileSync(`${baseDir}/html-templates/comments.html`, 'utf8');
  return html.replace("${tripName}",this.trip.rawTripName)
    .replace("${activityList}",listAsHtml(comments.activities, "Activities"))
    .replace("${stayList}",listAsHtml(comments.stay, "Stay"))
    .replace("${flightList}",listAsHtml(comments.flight, "Flight"))
    .replace("${rentalCarList}",listAsHtml(comments.car, "Car"))
    .replace("${expenseReportDetails}",listAsHtml(comments.expenses, "Expenses"))
    .replace("${otherComments}",listAsHtml(comments.others, "Other comments"));
}

// TODO: Comments section here is a duplicate of formatComments above. Fix it.
TripDataFormatter.prototype.formatTripDetails = function(weatherDetails, activityDetails) {
  const comments = this.trip.parseComments();
  // const todoList = this.trip.getInfoFromTrip(TripData.todo);
  const packList = this.trip.getPackList();
  const todoList = this.trip.getTodoList();
  let activities = listAsHtml(comments.activities, "Activities");
  activities += formatActivities.call(this, activityDetails);
  const html = fs.readFileSync(`${baseDir}/html-templates/trip-page.html`, 'utf8');
  // since this is the entire trip, obtain expense information that is present under 'expenses' key in the trip object
  comments.expenses = this.trip.getExpenseDetails();
  // TODO: Do this for weather, flight and other details..
  return html.replace("${tripName}",this.trip.rawTripName)
    .replace("${activityDetails}",activities)
    .replace("${weatherDetails}", _formatWeatherDetails.call(this, weatherDetails))
    .replace("${stayDetails}",listAsHtml(comments.stay, "Stay"))
    .replace("${flightDetails}",listAsHtml(comments.flight, "Flight"))
    .replace("${carDetails}",listAsHtml(comments.car, "Car"))
    .replace("${expenseReportDetails}",listAsHtml(comments.expenses, "Expenses"))
    .replace("${otherComments}",listAsHtml(comments.others, "Other comments"))
    .replace("${todoList}",listAsHtml(todoList.todo, "Todo"))
    .replace("${toPackList}",listAsHtml(packList.toPack, "Pack list"))
    .replace("${donePackList}",listAsHtml(packList.done, "Done pack list"));
}

TripDataFormatter.prototype.formatTodoList = function(headers) {
  const todoList = this.trip.getTodoList();
  const tripName = this.trip.data.name;
  if(_.isUndefined(todoList)) {
    return `Could not find todoList for trip ${tripName}`;
  }
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("formatTodoList: header or user-agent not defined. sending back json");
    return todoList;
  }
  logger.debug(`formatTodoList: headers is ${JSON.stringify(headers)}`);
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("formatTodoList: request call from browser. sending back html");
    let html = fs.readFileSync(`${baseDir}/html-templates/todo-list.html`, 'utf8');
    html = html.replace("${tripName}", capitalize1stChar(this.trip.data.rawName));
    if((!todoList.todo && !todoList.done) || (todoList.todo.length <= 0 && todoList.done.length <= 0)) {
      const html = fs.readFileSync(`${baseDir}/html-templates/no-data-available.html`, 'utf8');
      return html.replace("${tripName}",this.trip.rawTripName)
                 .replace("${title}", "Comments");
    }
    if(todoList.todo.length && todoList.todo.length > 0 ) html = html.replace("${todoList}",listAsHtml(todoList.todo, "Todo"));
    else html = html.replace("${todoList}","");
    if(todoList.done && todoList.done.length > 0) html = html.replace("${doneList}",listAsHtml(todoList.done, "Done"));
    else html = html.replace("${doneList}","");
    return html;
  }
  logger.info("formatTodoList: request call from something other than browser. sending back json");
  return todoList;
}

TripDataFormatter.prototype.formatPackList = function(headers) {
  const packList = this.trip.getPackList();
  const tripName = this.trip.data.name;
  if(_.isUndefined(packList)) {
    const html = fs.readFileSync(`${baseDir}/html-templates/no-data-available.html`, 'utf8');
    return html.replace("${tripName}",this.trip.rawTripName)
             .replace("${title}", "Comments");
  }
  if(_.isUndefined(headers) || _.isUndefined(headers['user-agent'])) {
    logger.info("formatPackList: header or user-agent not defined. sending back json");
    return packList;
  }
  if(headers['user-agent'].startsWith("Mozilla")) {
    logger.info("formatPackList: request call from browser. sending back html");
    const html = fs.readFileSync("html-templates/pack-list.html", 'utf8');
    return html.replace("${toPackList}",listAsHtml(packList.toPack, "To pack"))
      .replace("${tripName}", this.trip.data.rawName)
      .replace("${donePackList}",listAsHtml(packList.done, "Done"));
  }
  logger.info("formatPackList: request call from something other than browser. sending back json");
  return packList.toPack;
}

function _formatWeatherDetails(weatherDetails) {
  if(!weatherDetails) return "";
  const keys = Object.keys(weatherDetails);
  if(keys.indexOf("nocity") > -1) {
    // no weather details available since the trip does not have any city information
    return weatherDetails.nocity;
  }

  // if all the cities have "no weather information available", there's no point in sending any html back.
  let noWeatherDetails = true;
  keys.forEach(city => {
    if(!weatherDetails[city][0].startsWith("No weather information")) noWeatherDetails = false;
  });
  if(noWeatherDetails) return "";

  let wText = `
    <div data-role="collapsibleset">
      <div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">
        <h1>Weather Details</h1>
    `; 
  keys.forEach(city => {
      wText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d" data-collapsed="false">\n`;
      wText += `<h1>${capitalize1stChar(city)}</h1>\n`;
      weatherDetails[city].forEach(note => {
          wText += `<p>${toLink(note)}</p>\n`;
          });
      wText += `</div>\n`;
      });

  wText += `</div>
    </div>`;
  return wText;
}

TripDataFormatter.prototype.formatWeatherDetails = function(weatherDetails, addlWeatherDetails) {
  const html = fs.readFileSync("html-templates/weather-details.html", 'utf8');
  const formattedWeatherDetails = _formatWeatherDetails.call(this, weatherDetails);
  return html.replace("${citiesWeatherDetails}", formattedWeatherDetails)
             .replace("${additionalWeatherDetails}", toLink(addlWeatherDetails));
}

function formatActivities(activityDetails) {
  if(!activityDetails) return "";
  const keys = Object.keys(activityDetails);
  if(keys.indexOf("nocity") > -1) {
    // no activity details available since the trip does not have any city information
    return activityDetails.nocity;
  }
  // if none of the cities have any activities, no point in sending html
  let noActivities = true;
  keys.forEach(city => {
    if(!activityDetails[city][0].startsWith("No activity information")) noActivities = false;
  });
  if(noActivities) return "";

  let aText = `
    <div data-role="collapsibleset">
      <div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">
        <h1>Activities Details</h1>
        `;
  keys.forEach(city => {
      aText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
        aText += `<h1>${capitalize1stChar(city)}</h1>\n`;
        activityDetails[city].forEach(note => {
          aText += `<p>${toLink(note)}</p>\n`;
        });
      aText += `</div>\n`;
  });
  aText += `</div>
    </div>`;
  return aText;
}

// TODO: Might be a duplicate of above function.
TripDataFormatter.prototype.formatActivityDetails = function(activityDetails) {
  const html = fs.readFileSync("html-templates/activity-details.html", 'utf8');
  const aText = formatActivities.call(this, activityDetails);
  return html.replace("${activityDetails}", aText);
}

/*
   {
   "Seattle to Lisbon roundtrip": [
   {
   },
   {
   "price":
   "bookLink":
   "agent":
   "onward": {
   "travelDate":
   "duration":
   "stops":
   "segments":
   },
   "return": {
   "travelDate":
   "duration":
   "stops":
   "segments":
   }
   }
   }

   Itinerary 1:
Price: $780/-; Agent: ; Link: ;
Onward:
Stops: ; 
Segment Details:
Start date: ; Return date: ; Duration: ; Origin: ; Destination: ; Flight: ; Flight Name: ;
Return:
Segment Details:
Start date: ; Return date: ; Duration: ; Origin: ; Destination: ; Flight: ; Flight Name: ;
*/
TripDataFormatter.prototype.formatFlightDetails = function(flightDetails) {
  const html = fs.readFileSync("html-templates/flight-details.html", 'utf8');

  const keys = Object.keys(flightDetails);
  if(keys.indexOf("noflight") > -1) {
    return html.replace("${flightDetails}", flightDetails.noflight);
  }
  let fText = `<div data-role="collapsibleset">\n`;
  keys.forEach(fromTo => {
    fText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
    fText += `<h1>${fromTo} roundtrip</h1>\n`;
    const itinList = flightDetails[fromTo];
    for(let i = 0; i < itinList.length; i++) {
      fText += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
        fText += `<h1>Itinerary ${i+1}</h1>\n`;
        const itin = itinList[i];
        const options = itin.options[0];
        fText += `<p>Price per person: $${options.price}/-; Agent: ${options.agent}; <a href=${options.uri}>Book it</a></p>\n`;
        fText += _itinDetailsHtml("Onward", itin.outbound);
        fText += _itinDetailsHtml("Return", itin.inbound);
      fText += "</div>\n"; // itinerary collapsible
    }
    fText += "</div>\n"; // fromTo collapsible
  });
  fText += `</div>\n`; // close for collapsible set
  return html.replace("${flightDetails}", fText);
}

function _itinDetailsHtml(title, details) {
  let html = `<h2>${title}</h2>\n`;
  html += `<p>Stops: ${details.stops}; Leave at: ${details.departure}; Arrive at: ${details.arrival}; Duration: ${details.duration}; </p>\n`;
  html += `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
  html += "<h2>Segment Details</h2>\n";
  details.segmentDetails.forEach(segment => {
    html += `<p>Leave at: ${segment.departure}; Arrive: ${segment.arrival}; Duration: ${segment.duration}; Origin: ${segment.origin}; Destination: ${segment.destination}; Flight: ${segment.airlines}; FlightNum: ${segment.flightNum}</p>\n`;
  });
  html += "</div>\n"; // segment collapsible
  return html;
}

TripDataFormatter.prototype.formatFlightQuotes = function(flightDetails) {
  const html = fs.readFileSync(`${baseDir}/html-templates/flight-quote-details.html`,'utf-8');
  const keys = Object.keys(flightDetails);
  if(keys.indexOf("noflight") > -1) {
    return html.replace("${flightDetails}", flightDetails.noflight)
               .replace("${startDate}", this.trip.data.startDate)
               .replace("${returnDate}", this.trip.data.returnDate);
  }
  let flightDetailsHtml = "";
  for(let i = 0; i < flightDetails.length; i++) {
    const thisQuote = flightDetails[i];
    let thisHtml = `<div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d">\n`;
    thisHtml += `<h1>Price: $$${thisQuote.price}</h1>\n`;
    thisHtml += `<p>Onward Carrier: <b>${thisQuote.originCarrier[0]}</b>; Nonstop: <b>${thisQuote.originDirect}</b></p>\n`;
    thisHtml += `<p>Return Carrier: <b>${thisQuote.returnCarrier[0]}</b>; Nonstop: <b>${thisQuote.returnDirect}</p></b>\n`;
    thisHtml += `</div>\n`;
    flightDetailsHtml += thisHtml;
  }
  return html.replace("${startDate}", flightDetails.departureDate)
             .replace("${returnDate}", flightDetails.returnDate)
             .replace("${flightDetails}", flightDetailsHtml);
}

TripDataFormatter.prototype.formatHandleTravelersPage = function() {
  return fs.readFileSync(`${baseDir}/html-templates/new-trip-handle-travelers.html`, 'utf8');
}

// choosing cities for a new trip. This will include selecting a port of entry as well.
TripDataFormatter.prototype.formatCities = function() {
  if(_.isUndefined(this.trip.country)) {
    logger.warn(`formatCities: No country information for ${this.trip.data.name}`);
    return `No cities for country ${this.trip.data.name}`;
  }
  const cities = this.trip.country.cities;
  logger.info(`Found ${cities.length} cities in ${this.trip.data.name}`);
  let selection = "";
  cities.forEach(city => {
    selection += `<option value="${city}">${city}</option>`;
  });
  const sd = new Date(this.trip.data.startDate);
  const startDate = `${sd.getMonth()+1}/${sd.getDate()}/${sd.getFullYear()-2000}`;
  const rd = new Date(this.trip.data.returnDate);
  const returnDate = `${rd.getMonth()+1}/${rd.getDate()}/${rd.getFullYear()-2000}`;
  return fs.readFileSync("html-templates/cities.html", 'utf8')
    .replace("${cityList}", selection)
    .replace("${country}", this.trip.data.country)
    .replace("${returnDate}", returnDate)
    .split("${startDate}").join(startDate);
}

// adding cities for existing trip
TripDataFormatter.prototype.addCitiesExistingTrip = function() {
  if(_.isUndefined(this.trip.country)) {
    logger.warn(`addCitiesExistingTrip: No country information for ${this.trip.data.name}`);
    return `No cities for country ${this.trip.data.name}`;
  }
  const cities = this.trip.country.cities;
  logger.info(`Found ${cities.length} cities in ${this.trip.data.name}`);
  let selection = "";
  cities.forEach(city => {
      selection += `<option value="${city}">${city}</option>`;
  });
  return fs.readFileSync(`${baseDir}/html-templates/add-cities.html`, 'utf8')
    .replace("${cityList}", selection)
    .replace("${country}", this.trip.data.country);
}

TripDataFormatter.prototype.formatCityChoicePage = function() {
  return fs.readFileSync("html-templates/handle-city-choice.html", 'utf8');
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

TripDataFormatter.prototype.formatExpensePage = function(report) {
  const reportSummary = report.owesReport;
  const spendSummary = report.spendSummary;
  const comments = report.comments;
  const note = report.note;
  const html = fs.readFileSync("html-templates/expense-reports.html", 'utf8');
  let summary = "";
  const keys = Object.keys(reportSummary);
  Object.keys(reportSummary).forEach(key => {
    reportSummary[key].forEach(item => {
      summary = summary.concat(`<p>${capitalize1stChar(key)} owes ${capitalize1stChar(item.famOwed)} <b>$${item.amtOwed}</b>/-</p>`);
    });
  });
  let ssHtml = "";
  Object.keys(spendSummary).forEach(fam => {
    ssHtml = ssHtml.concat(`<p>${capitalize1stChar(fam)} & family spent <b>$${spendSummary[fam]}</b>/-</p>`);
  });

  return html.replace("${reportSummary}", summary)
             .replace("${spendSummary}", ssHtml)
             .replace("${note}", note)
             .replace("${expenseReportDetails}", listAsHtml(comments, "Expenses"));
}

TripDataFormatter.prototype.displayCalendar = function(hometown) {
  const calFormatter = new CalendarFormatter(this.trip, hometown, this.fbid);
  // if(headers['user-agent'].startsWith("Mozilla")) {
  if(0) {
    logger.debug(`displayCalendar: Request from browser. Sending the full calendar view`);
    return calFormatter.format();
  }
  return calFormatter.formatForMobile();
}

function toLink(text) {
  const words = text.split(' ');
  words.forEach((word, i) => {
    // handle case where the link is within brackets
    if(word.startsWith("(")) {
      const contents = word.match(/\((.*?)\)/);
      if(contents) {
        words[i] = `(<a href=${contents[1]}>${contents[1]}</a>)`;
      }
      return;
    }
    if(word.startsWith("[")) {
      const contents = word.match(/\[(.*?)\]/);
      if(contents) {
        words[i] = `[<a href=${contents[1]}>${contents[1]}</a>]`;
      }
      return;
    }
    if(word.startsWith("{")) {
      const contents = word.match(/\{(.*?)\}/);
      if(contents) {
        words[i] = `{<a href=${contents[1]}>${contents[1]}</a>}`;
      }
      return;
    }
    // match http or https
    if(/^https?:\/\//.test(word.toLowerCase())) {
      words[i] = `<a href=${word.toLowerCase()}>${word.toLowerCase()}</a>`;
    }
  });
  return words.join(' ');
}

function listAsHtml(list, title) {
  if(_.isNull(list) || _.isUndefined(list) || _.isEmpty(list)) return "";
  // logger.debug(`listAsHtml: Handling list ${JSON.stringify(list)} with title ${title}`);
  let html = `
    <div data-role="collapsible" data-collapsed-icon="carat-r" data-expanded-icon="carat-d" data-collapsed="false">
      <h1>${title}</h1>
      <p> <ol>`;
        list.forEach(function(item) {
          if(item) html += "<li>" + toLink(capitalize1stChar(item)) + "</li>";
        });
  html += `
      </ol> </p> 
    </div>`;
  return html;
}

module.exports = TripDataFormatter;
