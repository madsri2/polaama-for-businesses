'use strict';
const CurrencyConverter = require('../app/currency-converter');
const expect = require('chai').expect;

describe("Currency converter", function() {
  it("From euro to USD", function() {
    const converter = new CurrencyConverter();
    expect(converter.convert(100,"euro")).to.equal(106.29);
  });

  it("From non-integer euro to USD", function() {
    const converter = new CurrencyConverter();
    expect(converter.convert(6.45,"euro")).to.equal(6.856);
  });
});
