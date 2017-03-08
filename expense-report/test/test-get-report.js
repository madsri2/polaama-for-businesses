'use strict';

const ReportFetcher = require('../app/report-fetcher');
const expect = require('chai').expect;

describe("Testing getReport", function() {
  it("expense report for portugal", function() {
    const reportFetcher = new ReportFetcher("portugal");
    const expectedSummary = {
      'jaideep': [{
        'famOwed': "madhu",
        'amtOwed': 118.72
      }]
    };
    const expectedSpendSummary = {
      'madhu': 681.27,
      'jaideep': 773.26
    };
    const report = reportFetcher.getReport();
    expect(report.owesReport).to.deep.equals(expectedSummary);
    expect(report.spendSummary).to.deep.equals(expectedSpendSummary);
  });
});

