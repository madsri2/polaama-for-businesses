'use strict';

const logger = require('../../my-logger');
const fs = require('fs');
const CreateItinerary = require('trip-itinerary/app/create-itin'); 
const DayPlanner = require('calendar-view/app/day-planner');

const alphabet = ['a','b','c','d','e','f','g'];
const dayString = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const htmlBaseDir = "/home/ec2-user/html-templates"; // TODO: Move this to config.

// This class gets data from trips/portugal-itinerary.txt and creates a calendar view from that information.
function FormatCalendar(trip, departureCity, fbid) {
  if(!fbid) throw new Error(`FormatCalendar: required parameter fbid not passed`);
  if(!trip) throw new Error(`FormatCalendar: required parameter trip not passed`);
  if(!departureCity) departureCity = trip.data.leavingFrom;
  if(!departureCity) throw new Error(`FormatCalendar: required parameter departureCity not passed. trip.leavingFrom is not present as well.`);
  this.trip = trip;
  this.tripData = this.trip.data;
  this.tripName = this.trip.rawTripName;
  this.departureCity = departureCity;
  this.fbid = fbid;
  fetchItinerary.call(this);
  this.html = "";
}

FormatCalendar.prototype.formatForMobile = function() {
  const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  try {
    const html = fs.readFileSync(`${htmlBaseDir}/mobile-itinerary-view.html`, 'utf8');
    logger.debug(`formatForMobile: There are ${Object.keys(this.itinDetails).length} days in itinerary`);
    let itinView = "";
    let fullJs = "";
    Object.keys(this.itinDetails).forEach(day => {
      const thisDate = new Date(day);
      const month = thisDate.getMonth() + 1; // getMonth() starts with 0
      // convert "/" to "-" because this id will be used in javascript and a value like "#update-11/01/2017" will result in a syntax error
      const dateVal = CreateItinerary.formatDate(thisDate).split('/').join('-');
      itinView = itinView.concat(dayItin({
        "${dayOfMonth}": thisDate.getDate(),
        "${day}": weekDays[thisDate.getDay()],
        "${dateVal}": dateVal,
        "${monthName}": monthNames[thisDate.getMonth()],
        "${existingItinerary}": this.getThisDaysItin(thisDate)
      }));
      fullJs = fullJs.concat(getJavascript(dateVal));
    });
    return html.replace("${itinerary}", itinView)
               .replace("${javascript}", fullJs);
  }
  catch(err) {
    logger.error(`formatForMobile: Error formatting itinerary: ${err.stack}`);
    throw err;
  }
}

function dayItin(search) {
  try {
    let xformedString = fs.readFileSync(`${htmlBaseDir}/day-itinerary-view.html`, 'utf8');
    Object.keys(search).forEach(key => {
      xformedString = xformedString.split(key).join(search[key]);
    });
    return xformedString;
  }
  catch(e) {
    throw e;
  }
}

FormatCalendar.prototype.getThisDaysItin = function (date) {  
  const dateStr = CreateItinerary.formatDate(date);
  const dayPlanner = new DayPlanner(date, this.trip, this.fbid);
  return dayPlanner.getPlan(this.itinDetails[dateStr]).dayPlan;
}

function getJavascript(dateVal) {
  let js = `
    $("#update-${dateVal}", e.target ).on( "click", function( e ) { 
      $("#hidden-form-${dateVal}").removeClass("ui-screen-hidden"); 
      $("#list-${dateVal}").listview("refresh"); 
    }); 
    $("#itin-submit-${dateVal}", e.target).on("submit", function(e) { 
      e.preventDefault(); //cancel the submission 
      show("${dateVal}"); //send the request to server to save it 
    }); 
  `;
  return js; 
}

function getPreviousSunday() {
  const startDay = this.startDate.getDay();
  const previousSunday = new Date();
  previousSunday.setDate(date.getDate() - startDay);
  return previousSunday;
}

function capitalize1stChar(str) {
  return str.replace(/^[a-z]/g, function(letter, index, string) {
    return index == 0 ? letter.toUpperCase() : letter;
  });
}

function fetchItinerary() {
  this.itinDetails = (new CreateItinerary(this.trip, this.departureCity)).getItinerary();  
}

module.exports = FormatCalendar;
