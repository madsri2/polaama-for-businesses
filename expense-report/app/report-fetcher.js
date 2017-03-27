'use strict';

const Calculator = require('./calculator');
const TripData = require('../../trip-data');
const logger = require('../../my-logger');

function ReportFetcher(tripName) {
  this.trip = new TripData(tripName);
  this.tripName = tripName;
}

ReportFetcher.prototype.getReport = function() {
  // const families = getFamilyDetails.call(this);
  const families = this.trip.getTravelers();
  if(!families) {
    logger.warn(`getReport: No traveler information available for trip ${this.trip.rawTripName}. This is only possible if the user tried to get expense reports without adding any details or if we lost the data!`);
    return {
      'noreport': "No expense details available"
    }
  }
  const comments = this.trip.getExpenseDetails();
  if(!comments || comments.length === 0) {
    logger.warn(`getReport: No expense details present in trip ${this.trip.rawTripName}`);
    return {
      'noreport': "No expense details available"
    }
  };
  logger.info(`getReport: Got ${comments.length} comments from trip-data for trip ${this.tripName}`);
  const calculator = new Calculator();
  const report = calculator.calculate(comments, families);
  report.comments = comments;
  setNote.call(this, report);
  return report;
}

function setNote(report) {
  report.note = "";
  const or = report.owesReport;
  Object.keys(or).forEach(key => {
    const spend = report.spendSummary[key];
    or[key].forEach(record => {
      const famOwed = record.famOwed;
      const famOwedSpend = report.spendSummary[famOwed];
      if(famOwedSpend < spend) { // add note if A owes B but B spent more than A
        report.note = `<i>Note: person A might have spent more than person B, but might end up owing person B. This can happen when there are 1:1 transactions between A & B and B spent more (1:1 transactions are usually of the form "B owes A $xx ..." in the details below)</i>`;
        return;
      }
    });
    if(report.note != "") {
      return;
    }
  });
  return;
}

module.exports = ReportFetcher;
