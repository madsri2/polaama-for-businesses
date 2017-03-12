'use strict';

const ReportFetcher = require('../app/report-fetcher');
const expect = require('chai').expect;
const assert = require('chai').assert;

describe("Testing getReport", function() {
  it("expense report for portugal", function() {
    const reportFetcher = new ReportFetcher("portugal");
    const expectedSummary = {
      'Jaideep': [{
        'famOwed': "Madhu",
        'amtOwed': 118.72
      }]
    };
    const expectedSpendSummary = {
      'Madhu': 681.27,
      'Jaideep': 773.26
    };
    const report = reportFetcher.getReport();
    expect(report.owesReport).to.deep.equals(expectedSummary);
    expect(report.spendSummary).to.deep.equals(expectedSpendSummary);
    assert.notEqual(report.note, "", "report.note is blank, expected to have a value");
  });
});

