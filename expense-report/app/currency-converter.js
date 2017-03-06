'use strict';

function CurrencyConverter(to) {
  if(!to) {
    this.toCurrency = "usd";
  }
  else {
    this.toCurrency = to; 
  }
  // TODO: Get this from http://api.fixer.io/2017-02-10?symbols=USD,EUR and cache the information on a daily basis, so we don't have to get this during run time.
  this.exchangeRate = {
    'euro': {
      'usd': 1.0629
    }
  };
}

CurrencyConverter.prototype.convert = function(amount, fromCurrency) {
  if(!this.exchangeRate[fromCurrency][this.toCurrency]) {
    throw new Error(`We currently don't support exchange rate conversions from ${fromCurrency} to ${this.toCurrency}`);
  }
  const convertedAmt = amount * this.exchangeRate[fromCurrency][this.toCurrency];
  return +convertedAmt.toFixed(3);
}

module.exports = CurrencyConverter;
