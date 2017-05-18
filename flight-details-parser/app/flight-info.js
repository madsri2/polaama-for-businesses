'use strict';

// Object that represents facebook's flight-info object. See https://developers.facebook.com/docs/messenger-platform/send-api-reference/airline-itinerary-template (flight-info object)

function FlightInfo(options) {
  if(!options.dep_date) throw new Error(`FlightInfo: required parameter departure_date missing in passed parameter options`);
  const dd = new Date(options.dep_date);
  const formattedDate = `${dd.getFullYear()}-${dd.getMonth()+1}-${dd.getDate()}`;
  if(!options.dep_time || !options.dep_time) throw new Error(`FlightInfo: required parameter departure_time missing in options. flight num is ${options.flight_num}`);
  options.departure_time = `${formattedDate}T${options.dep_time}`;
  if(options.boarding_time) options.boarding_time = `${formattedDate}T${options.boarding_time}`;
  if(options.arrival_time) options.arrival_time = `${formattedDate}T${options.arrival_time}`;
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
  if(options.boarding_time) this.details.flight_schedule.boarding_time = options.boarding_time;
  if(options.arrival_time) this.details.flight_schedule.arrival_time = options.arrival_time;
  validate.call(this);
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
