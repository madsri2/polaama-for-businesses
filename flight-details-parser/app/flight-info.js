'use strict';

const moment = require('moment');

const baseDir = "/home/ec2-user";
const logger = require(`${baseDir}/my-logger`);

// Object that represents facebook's flight-info object. See https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-itinerary-template (flight-info object)

function FlightInfo(passedOptions) {
	// we will only use departure_time every where. this is there for backwards compatibility;
	if(!passedOptions.departure_time) passedOptions.departure_time = passedOptions.dep_time; 
	const options = updateDates.call(this, passedOptions);
  this.details = {
      flight_number: options.flight_num,
      departure_airport: {
        airport_code: options.dep_code,
        city: options.dep_city
      },
      arrival_airport: {
        airport_code: options.arr_code,
        city: options.arr_city
      },
      flight_schedule: {
        departure_time: options.departure_time
      }
  };
  if(options.dep_terminal) this.details.departure_airport.terminal = options.dep_terminal;
  if(options.arr_terminal) this.details.arrival_airport.terminal = options.arr_terminal;
  if(options.boarding_time) this.details.flight_schedule.boarding_time = options.boarding_time;
  if(options.arrival_time) this.details.flight_schedule.arrival_time = options.arrival_time;
  if(options.aircraft_type) this.details.aircraft_type = options.aircraft_type;
  validate.call(this);
}

function updateDates(po) {
	const keys = ['departure_time', 'arrival_time', 'boarding_time'];
	const options = po;
	let formattedDate;
	if(!options.departure_time) throw new Error(`FlightInfo: required parameter departure_time missing in passed options for flight num ${options.flight_num}`);
	if(options.dep_date) {
		const dd = new Date(options.dep_date);
		formattedDate = moment(new Date(options.dep_date)).format("YYYY-MM-DD"); 
	}
	keys.forEach(key => {
		if(!options[key]) return; // only departure_time is mandatory, so nothing to do if the other keys are not present
		// logger.debug(`updateDates: value for key ${key} is ${options[key]}`);
		if(options[key].includes('T')) {
			if(!moment(options[key],moment.ISO_8601).isValid()) throw new Error(`FlightInfo: The value of options.${key} is in the wrong format: ${options[key]}. Required format is YYYY-MM-DDTHH:mm`);
			// key is in the right format. nothing to do.
			return;
		}
		// if the time is not in the expected format, expect the date to be present.
		if(!options.dep_date) throw new Error(`FlightInfo: required parameter departure_date missing in passed parameter options`);
		options[key] = `${formattedDate}T${options[key]}`;
	});
	return options;
}

function validate() {
  const flightInfoFields = ['flight_number', 'departure_airport', 'arrival_airport', 'flight_schedule'];
  const airportFields = ['airport_code', 'city'];
  const flightScheduleFields = ['departure_time'];
  flightInfoFields.forEach(field => {
    if(!this.details[field]) throw new Error(`Required field ${field} missing in details.flight_info`);
  });
  airportFields.forEach(field => {
    if(!this.details.departure_airport[field]) throw new Error(`Required field ${field} missing in details.flight_info.departure_airport`);
    if(!this.details.arrival_airport[field]) throw new Error(`Required field ${field} missing in details.flight_info.arrival_airport`);
  });
  flightScheduleFields.forEach(field => {
    if(!this.details.flight_schedule[field]) throw new Error(`Required field ${field} missing in details.flight_info.flight_schedule`);
  });
}

FlightInfo.prototype.get = function() {
  return this.details;
}

module.exports = FlightInfo;
