'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var FAADataHelper = require('../faa_data_helper');
chai.config.includeStack = true;

describe('FAADataHelper', function() {
  var subject = new FAADataHelper();
  var airportCode;

  describe('#getAirportStatus', function() {
    context('with a valid airport code', function() {
      it('returns matching airport code', function() {
        airportCode = 'SFO';
        var value = subject.requestAirportStatus(airportCode).then(function(obj) {
          return obj.IATA;
        });
        return expect(value).to.eventually.eq(airportCode);
      });
    });
    context('with an invalid airport code', function() {
      it('returns invalid airport code', function() {
        airportCode = 'PUNKYBREWSTER';
        return expect(subject.requestAirportStatus(airportCode)).to.be.rejectedWith(Error);
      });
    });
  });

  describe('#formatAirportStatus', function() {
    var status = {
      'delay': 'true',
      'name': 'Hartsfield-Jackson Atlanta International',
      'ICAO': 'KATL',
      'city': 'Atlanta',
      'weather': {
        'visibility': 5.00,
        'weather': 'Light Snow',
        'meta': {
          'credit': 'NOAA\'s National Weather Service',
          'updated': '3:54 PM Local',
          'url': 'http://weather.gov/'
        },
        'temp': '36.0 F (2.2 C)',
        'wind': 'Northeast at 9.2mph'
      },
      'status': {
        'reason': 'AIRLINE REQUESTED DUE TO DE-ICING AT AIRPORT / DAL AND DAL SUBS ONLY',
        'closureBegin': '',
        'endTime': '',
        'minDelay': '',
        'avgDelay': '57 minutes',
        'maxDelay': '',
        'closureEnd': '',
        'trend': '',
        'type': 'Ground Delay'
      }
    };
    context
  });
});
