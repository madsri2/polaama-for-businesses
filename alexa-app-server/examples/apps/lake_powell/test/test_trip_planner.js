'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
var expect = chai.expect;
var TripPlanner = require('../trip-planner');
chai.config.includeStack = true;

describe('TripPlanner', function() {
  var tp = new TripPlanner();

  describe('#getPackList', function() {
    context('valid trip', function() {
      it('returns matching destination',function() {
        var tripName = 'Big island';
        var value = tp.getPackList(tripName).then(function(packList) {
          console.log("test getPackList. obtained: " + JSON.stringify(packList));
          return packList.length;
        });
        return expect(value).to.eventually.eq(2);
      });
    });
  });
});
