'use strict';

const Calculator = require('./calculator');
const TripData = require('../../trip-data');
const logger = require('../../my-logger');

function ReportFetcher(tripName) {
  this.trip = new TripData(tripName);
  this.tripName = tripName;
}

ReportFetcher.prototype.getReport = function() {
  const families = getFamilyDetails.call(this);
  const comments = this.trip.getExpenseReport();
  if(!comments || comments.length === 0) {
    return {
      'noreport': "No expense details available"
    }
  };
  logger.info(`getReport: Got ${comments.length} comments from trip-data for trip ${this.tripName}`);
  const calculator = new Calculator();
  const report = calculator.calculate(comments, families);
  report.comments = comments;
  // console.log(`getReport: ${JSON.stringify(report)}`);
  return report;
}

function getFamilyDetails() {
  // TODO: Use trip information / session info if needed to get travelers list and create the family accordingly.
  return {
    "Madhu" : ["Madhu", "Aparna", "M", "A"],
    "Jaideep" : ["Reshma", "Jaideep", "J", "R"]
  };
}

module.exports = ReportFetcher;
