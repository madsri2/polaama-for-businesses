'use strict';

const baseDir = "/home/ec2-user";
const Encoder = require(`${baseDir}/encoder`);
const logger = require(`${baseDir}/my-logger`);
const Promise = require('promise');

// Use data obtained from https://openflights.org/data.html#airport to get details. Here are the titles for each column
/*
  Airport ID: Unique OpenFlights identifier for this airport.
  Name:  Name of airport. May or may not contain the City name.
  City:  Main city served by airport. May be spelled differently from Name.
  Country: Country or territory where airport is located. See countries.dat to cross-reference to ISO 3166-1 codes.
  IATA:  3-letter IATA code. Null if not assigned/unknown.
  ICAO:  4-letter ICAO code.  Null if not assigned.
  Latitude: Decimal degrees, usually to six significant digits. Negative is South, positive is North.
  Longitude: Decimal degrees, usually to six significant digits. Negative is West, positive is East.
  Altitude: In feet.
  Timezone: Hours offset from UTC. Fractional hours are expressed as decimals, eg. India is 5.5.
  DST: Daylight savings time. One of E (Europe), A (US/Canada), S (South America), O (Australia), Z (New Zealand), N (None) or U (Unknown). See also: Help: Time
  Tz: database time zone Timezone in "tz" (Olson) format, eg. "America/Los_Angeles".
  Type:  Type of the airport. Value "airport" for air terminals, "station" for train stations, "port" for ferry terminals and "unknown" if not known. In airports.csv, only type=airport is included.
  Source:  Source of this data. "OurAirports" for data sourced from OurAirports, "Legacy" for old data not matched to OurAirports (mostly DAFIF), "User" for unverified user contributions. In airports.csv, only source=OurAirports is included.
*/
function AirportCodes() {
  const file = `${baseDir}/countries/airports.dat`;
  this.codes = {};
  this.cities = {};
  const self = this;
  this.promise = require('readline-promise').createInterface({
    input: require('fs').createReadStream(file)
  }).each(function(line) {
    const contents = line.split(',');
    if(!contents[2] || contents[2] === '""' || !contents[4] || contents[4] === '""') {
      // logger.warn(`Either city or iatacode missing for line ${line}. Ignoring it`);
      return;
    }
    const city = Encoder.encode(contents[2].replace(/"/g,''));
    const iataCode = Encoder.encode(contents[4].replace(/"/g,''));
    const airportName = contents[1];
    // if there are multiple airports in the same city, choose the one that is international. If there are multiple international airports in a city, we choose the last one in the list.
    if(self.codes[city]) {
      // logger.debug(`AirportCodes: multiple airports in city ${city}. This airport's name is ${airportName}.`);
      if(airportName.toLowerCase().includes("international")) {
        // logger.debug(`AirportCodes: choosing code ${iataCode} for city ${city} with code ${iataCode} and airport ${airportName}`);
        self.codes[city] = iataCode;
      }
    }
    else self.codes[city] = iataCode;
    self.cities[iataCode] = city;
  }).catch(function(err) {
    logger.error(`AirportCodes: error in promise`);
    throw err;
  });
}

AirportCodes.prototype.getCode = function(city) {
  return this.codes[Encoder.encode(city)];
}

AirportCodes.prototype.getCity = function(iataCode) {
  return this.cities[Encoder.encode(iataCode)];
}

module.exports = AirportCodes;
