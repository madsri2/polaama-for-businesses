'use strict';
const baseDir = '/home/ec2-user';
const logger = require(`${baseDir}/my-logger`);
const WeatherInfoProvider = require(`${baseDir}/weather-info-provider`);
const BrowseQuotes = require(`trip-flights/app/browse-quotes`);

function ButtonsPlacement(urlPrefix, trip) {
  if(!urlPrefix) throw new Error(`ButtonsPlacement: required parameter urlPrefix is missing`);
  if(!trip) throw new Error(`ButtonsPlacement: required parameter trip (of type TripData) is missing`);
  this.urlPrefix = urlPrefix;
  this.tripName = trip.tripName;
  this.trip = trip;
  if(!this.tripName) throw new Error(`ButtonsPlacement: tripName undefined in passed trip ${JSON.stringify(trip)}`);
}

function url(prefix, suffix) {
  return `${prefix}/${suffix}`;
}

ButtonsPlacement.prototype.getPlacement = function() {
	const tripCalendar = {
  	type: "web_url",
  	url: url(this.urlPrefix, `${this.tripName}/calendar`),
  	title: "Trip calendar",
  	webview_height_ratio: "full",
  	messenger_extensions: true,
	};
  const seattleTripCalendar = {
  	type: "postback",
  	title: "Trip calendar",
  	payload: "trip_calendar_seattle",
  };
	const weather = {
		type:"web_url",
  	url: url(this.urlPrefix, `${this.trip.weatherUrlPath()}`),
		title: "     Weather",
		webview_height_ratio: "full",
		messenger_extensions: true,
	}; 
  const bpButton = {
	  type: "postback",
	  title: "Boarding pass",
	  payload: "boarding_pass"
  };
  const itinButton = {
	  type: "postback",
	  title: "Flight",
	  payload: "flight itinerary"
  };
  const returnItinButton = {
	  type: "postback",
	  title: "Return flight",
	  payload: "return flight"
  };
  const hotelDetailsButton = {
	  type: "postback",
	  title: "Hotel details",
	  payload: "hotel details"
  };
  const carDetailsButton = {
	  type: "postback",
	  title: "Car details",
	  payload: "car details"
  };
  const receiptsButton = {
	  type: "postback",
	  title: "Receipts",
	  payload: "get receipt"
  };
  const buttons = [];
  if(this.tripName === "seattle") buttons.push(seattleTripCalendar);
  else buttons.push(tripCalendar);
  const fs = require('fs');
	if(fs.existsSync(this.trip.boardingPassFile())) buttons.push(bpButton);
	if(fs.existsSync(this.trip.itineraryFile())) buttons.push(itinButton);
	// if(fs.existsSync(this.trip.returnFlightFile())) buttons.push(returnItinButton);
  if(fs.existsSync(this.trip.hotelRentalReceiptFile())) buttons.push(hotelDetailsButton);
  if(fs.existsSync(this.trip.rentalCarReceiptFile())) buttons.push(carDetailsButton);
  const receipts = this.trip.receipts();
  let receiptFile;
  if(receipts) receiptFile = this.trip.generalReceiptFile(receipts[0]);
  // logger.debug(`getPlacement: receipts list: ${receipts}; file: ${receiptFile}`);
  if(receiptFile && fs.existsSync(receiptFile)) buttons.push(receiptsButton);

  if(fs.existsSync(this.trip.runningTrailFile())) buttons.push({
	  type: "postback",
	  title: "   Running Trails",
	  payload: "running"
  });
  /*
  {
    type:"web_url",
  	url: url(this.urlPrefix, `${this.trip.activitiesUrlPath()}`),
    title:"Activities",
    webview_height_ratio: "compact",
    messenger_extensions: true,
  }, 
  */
  const todoListButton = {
    type: "web_url",
    url: url(this.urlPrefix, `${this.tripName}/todo`),
    title: "       Todo list",
    webview_height_ratio: "full",
    messenger_extensions: true
  };
  const todoList = this.trip.getTodoList();
  if(todoList && (todoList.length > 0)) buttons.push(todoListButton);

  const packListButton = {
    type: "web_url",
    url: url(this.urlPrefix, `${this.tripName}/pack-list`),
    title: "Trip Pack list",
    webview_height_ratio: "full",
    messenger_extensions: true
  };
  const packlist = this.trip.getPackList();
  if(Object.keys(packlist).length > 0) buttons.push(packListButton);
  
  const commentsButton = {
    type: "web_url",
    url: url(this.urlPrefix, `${this.tripName}/comments`),
    title: "Comments",
    webview_height_ratio: "full",
    messenger_extensions: true
  };
  const comments = this.trip.parseComments();
  if(Object.keys(comments).length > 0) buttons.push(commentsButton);
  
  const expenseButton = {
    type: "web_url",
  	url: url(this.urlPrefix, `${this.tripName}/expense-report`),
    title: "Expense report",
    webview_height_ratio: "full",
    messenger_extensions: true
  };
  if(this.trip.getTravelers()) buttons.push(expenseButton);
  // flight quote only if there is no flight details
	if(!fs.existsSync(this.trip.itineraryFile())) {
  const quotes = new BrowseQuotes(this.trip.data.leavingFrom, this.trip.getPortOfEntry(), this.trip.data.startDate, this.trip.data.returnDate);
    if(quotes.quoteExists()) buttons.push({
      type: "web_url",
    	url: url(this.urlPrefix, `${this.trip.flightQuoteUrlPath()}`),
      title:"Flight",
      webview_height_ratio: "full",
      messenger_extensions: true
    });
  }
  const wip = new WeatherInfoProvider(this.trip.data.country, this.trip.getPortOfEntry(), this.trip.data.startDate);
	if(wip.weatherInfoExists()) buttons.push(weather);
  // only add this button if there is another button in the third panel. This is done in order to get the buttons to show vertically (which depends on the title length).
  if((buttons.length > 3 && buttons.length < 6) || (buttons.length > 6 && buttons.length < 9)) buttons.push({
    type: "web_url",
  	url: url(this.urlPrefix, `${this.tripName}`),
    title: "All Trip Details", 
    webview_height_ratio: "full",
    messenger_extensions: true
  });
  const result = {
    firstSet: []
  };
  let list = result.firstSet;
  for(let i = 0; i < buttons.length; i++) {
    list.push(buttons[i]);
    if(i === 2 && (buttons.length > i + 1)) { 
      result.secondSet = [];
      list = result.secondSet;
    }
    if(i === 5 && (buttons.length > i + 1)) {
      result.thirdSet = [];
      list = result.thirdSet;
    }
    if(i === 8) break; // we only allow the top 9 buttons for now.
  }
  // logger.debug(`getPlacement: dump: ${JSON.stringify(result)}`);
  return result;
}

module.exports = ButtonsPlacement;
