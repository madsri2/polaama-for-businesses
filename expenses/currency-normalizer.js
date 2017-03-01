'use strict';

function NormalizeCurrency(from, to, amount) {
  this.from = from; // EUR
  this.to = to; // USD
  this.amount = amount;
}

NormalizeCurrency.prototype.normalize = function() {
  // http://api.fixer.io/2017-02-10?symbols=USD,EUR
  return this.amount * 1.0629; 
}

module.exports = NormalizeCurrency;
