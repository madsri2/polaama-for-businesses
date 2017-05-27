'use strict';

const fs = require('fs');
const EmailParser = require('flight-details-parser/app/email-parser');
const Notifier = require('notifications/app/notifier');
const FlightInfo = require('flight-details-parser/app/flight-info');
const TripFinder = require('flight-details-parser/app/trip-finder');

const baseDir = `/home/ec2-user`;
const logger = require(`${baseDir}/my-logger`);
const WebhookPostHandler = require(`${baseDir}/webhook-post-handler`);

// use a mailparser like https://www.npmjs.com/package/mailparser to parse email
function BoardingPassHandler(options, testing) {
  if(testing) this.testing = testing;
  // fail fast if required fields or files are missing
  this.email = options.email;
  if(!this.email) throw new Error("required value email is missing");
  this.boardingPassImage = `${EmailParser.dir}/${this.email}/${options.attachment}`;
  // TODO: Send a notification asking the user to send a boarding pass (or) make this an itinerary
  if(!fs.existsSync(this.boardingPassImage)) throw new Error(`BoardingPassHandler: Boarding pass image does not exist at location ${this.boardingPassImage}. Cannot proceed`);
  // do some work
  const flightInfo = new FlightInfo(options);
  const dd = new Date(options.dep_date);
  this.dep_date = `${dd.getFullYear()}-${dd.getMonth()+1}-${dd.getDate()}`;
  this.dep_time = options.dep_time;
  // uses the format expected by facebook. Details of the data structure are at: https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-boardingpass-template
  this.details = {
    passenger_name: options.name,
    pnr_number: options.pnr,
    flight_info: flightInfo.get(),
    'logo_image_url': `https://www.example.com/en/logo.png`, 
    'above_bar_code_image_url': `https://www.example.com/en/PLAT.png`, 
  };
  if(options.seat) 
    this.details.seat = options.seat;
  else 
    logger.warn(`BoardingPassHandler: No seat number present for trip to city ${options.dep_city} by ${options.name} flying on flight ${options.flight_num}`);
  if(options.terminal) {
    this.details.auxiliary_fields = [];
    this.details.auxiliary_fields.push({
      label: "Terminal",
      value: options.terminal
    });
  }
  if(options.gate || options.group) {
    this.details.secondary_fields = [];
    if(options.gate) this.details.secondary_fields.push({
      label: "Gate",
      value: options.gate
    });
    if(options.group) this.details.secondary_fields.push({
      label: "Zone",
      value: options.group
    });
  }
  validateFields.call(this);
}

/*
1) Find trip
2) Once we have trip information: 
  a) Call flightDetailsParser.parse to validate the details, store it in a file 
  b) mark the corresponding trip's "flight ticket" activity as done
  c) Notify the user via chat that we have the boarding pass and we will send notification + boarding pass a day before trip.
*/
BoardingPassHandler.prototype.handle = function() {
  /* 
    // This was needed before I decided to get the arrival code from customer email. Keeping this comment around for posterity.
    const airportCodes = require('airport-codes');
    const airportCode = this.details.arrival_airport.airport_code;
    const destCity = airportCodes.findWhere({iata: `${airportCode}`}).get('city');
    if(!destCity) throw new Error(`handle: cannot find city for code ${code}`);
  */
  // get city corresponding to destination airport code
  const destCity = this.details.flight_info.arrival_airport.city;

  const tripFinder = new TripFinder(this.details.passenger_name);
  this.trip = tripFinder.getTrip(this.dep_date, destCity);
  this.postHandler = new WebhookPostHandler(tripFinder.getSession(), this.testing);

  this.details.barcode_image_url = getBoardingPassImage.call(this); // Do this before writing boarding pass details into the boardingPass file so that the image url will be captured in the file.

  // 3) Store itinerary + boarding pass information
  try {
    const file = this.trip.boardingPassFile();
    fs.writeFileSync(file, JSON.stringify(this.details), 'utf8');
    // send a notification to the user that we have their details and will send them the boarding pass the day before the flight.
    this.trip.markTodoItemDone("Flight tickets");
    // if it's time to send boarding pass, send it.
    const boardingPass = (new Notifier()).getImminentTripBoardingPass(this.trip, tripFinder.getSession());
    if(boardingPass) this.postHandler.sendBoardingPass(boardingPass);
    else {
      // notify user that we have received a boarding pass.
      const message = `Received boarding pass for your trip to ${this.trip.getPortOfEntry()}. We will send it to you a few hours before the trip, so it will be available offline`;
      logger.debug(`handle: About to send message to user: ${message}`);
      this.postHandler.notifyUser(message);
    }
  }
  catch(e) {
    logger.error(`parse: Error writing to file ${this.trip.boardingPassFile()}. ${e.stack}`);
    throw e;
  }
  // trigger a notification for this trip.
  logger.debug(`handle: Stored flight details, marked todo item as done and pushed notification`);
  return true;
}

function getBoardingPassImage() {
  // copy this attachment into the trips directory
  const tripBpImage = this.trip.boardingPassImage();
  logger.debug(`boardingPassImage: copying email image from file ${this.boardingPassImage} to ${tripBpImage}`);
  fs.createReadStream(this.boardingPassImage).pipe(fs.createWriteStream(tripBpImage));
  return this.postHandler.createUrl(`${this.trip.data.name}/boarding-pass-image`);
}

// ensure that required fields are present. If they are not present, throw an exception
// Validate that all required parameters by the FB API are present. Details: https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-boardingpass-template
function validateFields() {
  const requiredFields = ['passenger_name', 'pnr_number', 'flight_info', 'logo_image_url', 'above_bar_code_image_url'];
  requiredFields.forEach(field => {
    if(!this.details[field]) throw new Error(`Required field ${field} missing in details`);
  });
}


module.exports = BoardingPassHandler;
