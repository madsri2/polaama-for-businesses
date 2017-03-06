'use strict';

const ReportFetcher = require('../app/report-fetcher');
const expect = require('chai').expect;

describe("Testing getReport", function() {
  it("expense report for portugal", function() {
    const reportFetcher = new ReportFetcher("portugal");
    const expectedResult = {
      'fam-rj': {
        'owes': {
          'fam-ma': 118.72
        }
      }
    };
    expect(reportFetcher.getReport(), expectedResult);
  });
});

