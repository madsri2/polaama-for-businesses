'use strict';

const Calculator = require('./calculator');
const TripData = require('../../trip-data');

function ReportFetcher(tripName) {
  this.trip = new TripData(tripName);
}

ReportFetcher.prototype.getReport = function() {
  const families = getFamilyDetails.call(this);
  const comments = this.trip.getExpenseReport();
  console.log(`Got ${comments.length} comments from trip-data`);
  const calculator = new Calculator();
  const report = calculator.getSummary(comments, families);
  report.comments = comments;
  return report;
}

function getFamilyDetails() {
  // TODO: Use trip information / session info if needed to get travelers list and create the family accordingly.
  return {
    "madhu" : ["Madhu", "Aparna", "M", "A"],
    "jaideep" : ["Reshma", "Jaideep", "J", "R"]
  };
}

module.exports = ReportFetcher;
