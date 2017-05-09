'use strict';

const ReportFetcher = require('expense-report/app/report-fetcher');
const expect = require('chai').expect;
const assert = require('chai').assert;
const baseDir = "/home/ec2-user";
const TripData = require(`${baseDir}/trip-data`);

describe("Testing getReport", function() {
  it("expense report for portugal", function() {
    const reportFetcher = new ReportFetcher(new TripData("portugal","1234"));
    const expectedSummary = {
      'Madhu': [{
        'famOwed': "Jaideep",
        'amtOwed': 260.45
      }]
    };
    const expectedSpendSummary = {
      'Madhu': 681.27,
      'Jaideep': 1531.59
    };
    const report = reportFetcher.getReport();
    expect(report.owesReport).to.deep.equals(expectedSummary);
    expect(report.spendSummary).to.deep.equals(expectedSpendSummary);
    // assert.notEqual(report.note, "", "report.note is blank, expected to have a value");
  });
});

